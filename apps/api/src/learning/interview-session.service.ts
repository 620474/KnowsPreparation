import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import type {
  InterviewConversationState,
  InterviewExercise,
  InterviewSessionEvaluation,
  InterviewSessionStage,
} from "@prep/contracts";
import { isValidObjectId, type Model } from "mongoose";

import { AiAgentService, type InterviewAnswerAssessment } from "../agents/ai-agent.service";
import { CareerApplicationEntry } from "../career/schemas/career-application.schema";
import { AiContentService, type AiDeltaHandler } from "./ai-content.service";
import type {
  SendInterviewAiMessageDto,
  StartInterviewSessionDto,
  SubmitInterviewExerciseDto,
  UpdateInterviewDefenseAnswerDto,
  UpdateInterviewPlatformAnswerDto,
  SubmitInterviewTurnDto,
} from "./dto/learning.dto";
import { runPracticeSolution } from "./generated-runner";
import {
  INTERVIEW_POLICY_VERSION,
  nextConversationState,
  reduceInterviewAction,
  type InterviewActionProposal,
} from "./interview-director";
import {
  getReadinessConfidence,
  getInterviewQuestionCandidates,
  interviewCompanyLabel,
  interviewDurationMinutes,
  selectInterviewExercises,
  selectInterviewQuestions,
  selectAdaptiveInterviewQuestion,
} from "./interview-session";
import { serializeInterviewSession } from "./learning-serialization";
import { LearningSignalService } from "./learning-signal.service";
import {
  buildAssessmentObservations,
  type AssessmentCriterionDraft,
} from "./evidence/native-assessment";
import {
  InterviewSession,
  type InterviewSessionDocument,
} from "./schemas/interview-session.schema";
import { InterviewTurnEntry } from "./schemas/interview-turn.schema";
import { inferSkillKeys } from "./skills";
import { resolveSkillIds } from "./skills/skill-resolver";

const FOLLOW_UP_FALLBACK =
  "Приведи практический пример и назови главный компромисс этого решения.";
const DEFENSE_FALLBACK = [
  "Объясни решение по шагам и оцени его временную и пространственную сложность.",
  "Как ты проверил совет AI и в каком случае предложенный подход даст неверный результат?",
];

const scoreExercise = (exercise: InterviewExercise) =>
  exercise.result && exercise.result.totalCount > 0
    ? Math.round((exercise.result.passedCount / exercise.result.totalCount) * 100)
    : 0;

const clampScore = (score: number) => Math.min(100, Math.max(0, Math.round(score)));

const weightedScore = (sections: Array<{ score: number; weight: number }>) => {
  const totalWeight = sections.reduce((sum, section) => sum + section.weight, 0);
  if (totalWeight === 0) return 0;
  return clampScore(
    sections.reduce((sum, section) => sum + section.score * section.weight, 0) /
      totalWeight,
  );
};

type InterviewAnswerOutcome = Omit<InterviewAnswerAssessment, "score"> & {
  score: number | null;
  assessed: boolean;
  unavailableReason: string | null;
};

type GeneratedInterviewEvaluation = Awaited<
  ReturnType<AiContentService["evaluateInterviewSession"]>
>;
type InterviewEvaluationOutcome =
  | (GeneratedInterviewEvaluation & { assessed: true })
  | (Omit<
      GeneratedInterviewEvaluation,
      "platformScore" | "aiScore" | "communicationScore"
    > & {
      platformScore: null;
      aiScore: null;
      communicationScore: null;
      assessed: false;
    });

const isPlatformItemComplete = (item: InterviewSessionDocument["platformItems"][number]) =>
  item.completed ?? Boolean(
    item.answer.trim() && item.followUpQuestion && item.followUpAnswer.trim(),
  );

@Injectable()
export class InterviewSessionService {
  private readonly logger = new Logger(InterviewSessionService.name);

  constructor(
    @InjectModel(InterviewSession.name)
    private readonly interviewModel: Model<InterviewSession>,
    @InjectModel(InterviewTurnEntry.name)
    private readonly interviewTurnModel: Model<InterviewTurnEntry>,
    @InjectModel(CareerApplicationEntry.name)
    private readonly careerApplicationModel: Model<CareerApplicationEntry>,
    private readonly aiContent: AiContentService,
    private readonly agents: AiAgentService,
    private readonly signals: LearningSignalService,
    private readonly config: ConfigService,
  ) {}

  async getCurrent() {
    const interview = await this.interviewModel
      .findOne({ status: { $in: ["in_progress", "evaluating"] } })
      .sort({ updatedAt: -1 })
      .exec();
    if (interview) await this.markExpiredIfNeeded(interview);
    return interview ? this.serialize(interview) : null;
  }

  async list(limit = 10) {
    const interviews = await this.interviewModel
      .find({ status: "completed" })
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return Promise.all(interviews.map((interview) => this.serialize(interview)));
  }

  async start(dto: StartInterviewSessionDto) {
    const current = await this.getCurrent();
    if (current) return current;
    const completedCount = await this.interviewModel.countDocuments({
      status: "completed",
    });
    const questions = selectInterviewQuestions(dto.mode, completedCount);
    const application = dto.applicationId
      ? await this.careerApplicationModel.findOne({ applicationId: dto.applicationId }).lean().exec()
      : null;
    if (dto.applicationId && !application) {
      throw new NotFoundException("Вакансия для интервью не найдена");
    }
    const vacancyContext = application
      ? [
          `${application.company} · ${application.role}`,
          application.description,
          application.analysis?.summary,
          application.analysis?.likelyInterviewTopics.join(", "),
        ].filter(Boolean).join("\n").slice(0, 12_000)
      : "";
    const [codingExercise, aiExercise] = selectInterviewExercises(
      dto.company,
      completedCount,
    );
    const startedAt = new Date();
    const durationMinutes = interviewDurationMinutes(dto.mode, dto.kind);
    const engineVersion = this.config.get<string>("INTERVIEW_V2_ENABLED") === "false" ? 1 : 2;
    const interview = await this.interviewModel.create({
      engineVersion,
      status: "in_progress",
      mode: dto.mode,
      kind: dto.kind ?? "training",
      company: dto.company,
      applicationId: application?.applicationId ?? null,
      vacancyContext,
      currentStage: "platform",
      durationMinutes,
      startedAt,
      deadlineAt: new Date(startedAt.getTime() + durationMinutes * 60_000),
      expiredAt: null,
      completedAt: null,
      platformQuestionTarget: questions.length,
      platformItems: questions.slice(0, 1).map((question) => ({
        question,
        answer: "",
        followUpQuestion: null,
        followUpAnswer: "",
        secondFollowUpQuestion: null,
        secondFollowUpAnswer: "",
        completed: false,
        assessment: null,
      })),
      codingExercise,
      aiExercise,
      aiMessages: [],
      defenseQuestions: [],
      defenseAnswers: [],
      evaluation: null,
      conversationState: engineVersion === 2
        ? {
            questionId: questions[0]!.id,
            depth: 0,
            completedQuestions: 0,
            turnCount: 1,
            lastAction: null,
            policyVersion: INTERVIEW_POLICY_VERSION,
          } satisfies InterviewConversationState
        : null,
      predictionSnapshotId: null,
    });
    if (engineVersion === 2) {
      await this.interviewTurnModel.create({
        turnId: randomUUID(),
        interviewId: String(interview._id),
        operationId: null,
        sequence: 0,
        role: "interviewer",
        action: null,
        questionId: questions[0]!.id,
        content: questions[0]!.prompt,
        answerText: null,
        assessment: null,
      });
    }
    return this.serialize(interview);
  }

  async submitDirectorTurn(interviewId: string, dto: SubmitInterviewTurnDto) {
    const interview = await this.getDocument(interviewId);
    if ((interview.engineVersion ?? 1) !== 2 || !interview.conversationState) {
      throw new BadRequestException("Эта сессия использует прежний сценарий интервью");
    }
    const duplicate = await this.interviewTurnModel.findOne({ operationId: dto.operationId }).lean().exec();
    if (duplicate) return this.serialize(interview);
    await this.assertStage(interview, "platform");

    const state = interview.conversationState;
    const item = interview.platformItems.find(
      (candidate) => candidate.question.id === state.questionId,
    );
    if (!item) throw new NotFoundException("Активный вопрос интервью не найден");
    const turns = await this.interviewTurnModel
      .find({ interviewId })
      .sort({ sequence: 1 })
      .lean()
      .exec();
    const answer = dto.answer.trim();
    const candidates = getInterviewQuestionCandidates(
      interview.platformItems.map((candidate) => candidate.question.id),
      interview.platformItems.length,
    );
    const fallback: InterviewActionProposal = state.depth >= 2
      ? {
          action: "move_on",
          prompt: "Перейдём к следующему вопросу.",
          nextQuestionId: candidates[0]?.id ?? null,
          score: null,
          confidence: "low",
          strengths: ["Ответ зафиксирован"],
          gaps: ["AI-оценка временно недоступна"],
        }
      : {
          action: state.depth === 0 ? "request_tradeoff" : "counterexample",
          prompt: state.depth === 0
            ? "Назови главный компромисс этого решения и практический пример."
            : "Приведи контрпример, где описанное правило перестанет работать.",
          nextQuestionId: null,
          score: null,
          confidence: "low",
          strengths: ["Ответ зафиксирован"],
          gaps: ["AI-оценка временно недоступна"],
        };
    let proposal = fallback;
    if (this.agents.enabled) {
      try {
        proposal = await this.agents.proposeInterviewAction({
          company: interviewCompanyLabel(interview.company),
          vacancyContext: interview.vacancyContext,
          question: item.question,
          transcript: [
            ...turns.slice(-11).map(({ role, content }) => ({ role, content })),
            { role: "candidate" as const, content: answer },
          ],
          depth: state.depth,
          secondsRemaining: Math.max(
            0,
            Math.ceil(((interview.deadlineAt?.getTime() ?? Date.now()) - Date.now()) / 1_000),
          ),
          candidateQuestions: candidates,
        });
      } catch (error) {
        this.logFallback("director_action", error);
      }
    }
    const nextQuestion = selectAdaptiveInterviewQuestion(candidates, proposal.nextQuestionId);
    const decision = reduceInterviewAction({
      state,
      proposal,
      kind: interview.kind,
      secondsRemaining: Math.max(
        0,
        Math.ceil(((interview.deadlineAt?.getTime() ?? Date.now()) - Date.now()) / 1_000),
      ),
      hasNextQuestion: Boolean(nextQuestion),
    });
    const assessment = {
      score: decision.score,
      confidence: decision.confidence,
      strengths: decision.strengths,
      gaps: decision.gaps,
      assessed: decision.score !== null,
      evaluatorVersion: "interview-director-evaluator-v1",
    } as const;
    const interviewerContent = decision.action === "move_on" && nextQuestion
      ? nextQuestion.prompt
      : decision.prompt;
    const interviewerQuestionId = decision.action === "move_on" && nextQuestion
      ? nextQuestion.id
      : item.question.id;
    await this.interviewTurnModel.insertMany([
      {
        turnId: randomUUID(),
        interviewId,
        operationId: dto.operationId,
        sequence: state.turnCount,
        role: "candidate",
        action: null,
        questionId: item.question.id,
        content: answer,
        answerText: answer,
        assessment,
      },
      {
        turnId: randomUUID(),
        interviewId,
        operationId: null,
        sequence: state.turnCount + 1,
        role: "interviewer",
        action: decision.action,
        questionId: interviewerQuestionId,
        content: interviewerContent,
        answerText: null,
        assessment: null,
      },
    ]);

    if (state.depth === 0) item.answer = answer;
    else {
      item.followUpAnswer = [item.followUpAnswer, answer].filter(Boolean).join("\n\n");
    }
    item.assessment = {
      ...assessment,
      assessmentSource: assessment.assessed ? "ai" : "unassessed",
      unavailableReason: assessment.assessed ? null : "ai_unavailable",
      evaluatedAt: new Date().toISOString(),
    };
    if (decision.action === "move_on") {
      item.completed = true;
      if (nextQuestion && state.completedQuestions + 1 < interview.platformQuestionTarget) {
        interview.platformItems.push({
          question: nextQuestion,
          answer: "",
          followUpQuestion: null,
          followUpAnswer: "",
          secondFollowUpQuestion: null,
          secondFollowUpAnswer: "",
          completed: false,
          assessment: null,
        });
      } else {
        interview.currentStage = "coding";
      }
    }
    interview.conversationState = nextConversationState(
      state,
      decision.action,
      decision.action === "move_on" && nextQuestion && interview.currentStage === "platform"
        ? nextQuestion.id
        : null,
    );
    interview.markModified("platformItems");
    interview.markModified("conversationState");
    await interview.save();
    return this.serialize(interview);
  }

  async updatePlatformAnswer(
    interviewId: string,
    questionId: string,
    dto: UpdateInterviewPlatformAnswerDto,
  ) {
    const interview = await this.getDocument(interviewId);
    await this.assertStage(interview, "platform");
    const item = interview.platformItems.find(
      (candidate) => candidate.question.id === questionId,
    );
    if (!item) throw new NotFoundException("Вопрос не входит в эту сессию");
    item.answer = dto.answer.trim();
    if (dto.followUpAnswer) item.followUpAnswer = dto.followUpAnswer.trim();
    if (dto.secondFollowUpAnswer) {
      item.secondFollowUpAnswer = dto.secondFollowUpAnswer.trim();
    }
    const answeredFollowUps = [
      item.followUpQuestion && item.followUpAnswer.trim()
        ? { question: item.followUpQuestion, answer: item.followUpAnswer.trim() }
        : null,
      item.secondFollowUpQuestion && item.secondFollowUpAnswer?.trim()
        ? { question: item.secondFollowUpQuestion, answer: item.secondFollowUpAnswer.trim() }
        : null,
    ].filter((value): value is { question: string; answer: string } => Boolean(value));
    const candidates = getInterviewQuestionCandidates(
      interview.platformItems.map((candidate) => candidate.question.id),
      interview.platformItems.length,
    );
    const assessment = await this.assessAnswerOrFallback({
      company: interviewCompanyLabel(interview.company),
      vacancyContext: interview.vacancyContext,
      question: item.question,
      answer: item.answer,
      followUps: answeredFollowUps,
      followUpCount: answeredFollowUps.length,
      candidateQuestions: candidates,
    });
    item.assessment = {
      score: assessment.score,
      confidence: assessment.confidence,
      strengths: assessment.strengths,
      gaps: assessment.gaps,
      assessed: assessment.assessed,
      assessmentSource: assessment.assessed ? "ai" : "unassessed",
      unavailableReason: assessment.unavailableReason,
      evaluatedAt: new Date().toISOString(),
    };
    if (!item.followUpQuestion && assessment.followUpQuestion) {
      item.followUpQuestion = assessment.followUpQuestion;
    } else if (
      item.followUpQuestion &&
      item.followUpAnswer.trim() &&
      !item.secondFollowUpQuestion &&
      assessment.followUpQuestion
    ) {
      item.secondFollowUpQuestion = assessment.followUpQuestion;
    } else {
      item.completed = true;
    }

    if (item.completed) {
      const completedCount = interview.platformItems.filter(
        isPlatformItemComplete,
      ).length;
      const target = interview.platformQuestionTarget ?? interview.platformItems.length;
      if (completedCount >= target) {
        interview.currentStage = "coding";
      } else {
        const nextQuestion = selectAdaptiveInterviewQuestion(
          candidates,
          assessment.nextQuestionId,
        );
        if (nextQuestion) {
          interview.platformItems.push({
            question: nextQuestion,
            answer: "",
            followUpQuestion: null,
            followUpAnswer: "",
            secondFollowUpQuestion: null,
            secondFollowUpAnswer: "",
            completed: false,
            assessment: null,
          });
        } else {
          interview.currentStage = "coding";
        }
      }
    }
    interview.markModified("platformItems");
    await interview.save();
    return this.serialize(interview);
  }

  async submitCodingAttempt(
    interviewId: string,
    dto: SubmitInterviewExerciseDto,
  ) {
    const interview = await this.getDocument(interviewId);
    await this.assertStage(interview, "coding");
    interview.codingExercise = await this.runExercise(
      interview.codingExercise,
      dto.solution,
    );
    interview.markModified("codingExercise");
    await interview.save();
    return this.serialize(interview);
  }

  async completeCoding(interviewId: string) {
    const interview = await this.getDocument(interviewId);
    await this.assertStage(interview, "coding");
    if (interview.codingExercise.attempts < 1) {
      throw new BadRequestException("Сначала запусти решение по тестам");
    }
    if (interview.kind === "exam") {
      interview.defenseQuestions = await this.defenseOrFallback(interview);
      interview.defenseAnswers = interview.defenseQuestions.map(() => "");
      interview.currentStage = "defense";
      interview.markModified("defenseQuestions");
      interview.markModified("defenseAnswers");
    } else {
      interview.currentStage = "ai";
    }
    await interview.save();
    return this.serialize(interview);
  }

  async sendAiMessage(
    interviewId: string,
    dto: SendInterviewAiMessageDto,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    const interview = await this.getDocument(interviewId);
    if (interview.kind === "exam") {
      throw new BadRequestException("AI недоступен до завершения экзамена");
    }
    await this.assertStage(interview, "ai");
    if (dto.solution !== undefined) {
      interview.aiExercise.solution = dto.solution;
      interview.markModified("aiExercise");
    }
    const content = dto.content.trim();
    interview.aiMessages.push({
      id: randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    });
    interview.markModified("aiMessages");
    await interview.save();
    const history = interview.aiMessages.slice(0, -1).map(({ role, content }) => ({
      role,
      content,
    }));
    const reply = await this.aiContent.generateInterviewAssistantReply(
      [
        interview.aiExercise.statement,
        `\nТекущий код:\n${interview.aiExercise.solution}`,
      ].join(""),
      history,
      content,
      onDelta,
      signal,
    );
    interview.aiMessages.push({
      id: randomUUID(),
      role: "assistant",
      content: reply,
      createdAt: new Date().toISOString(),
    });
    interview.markModified("aiMessages");
    await interview.save();
    return this.serialize(interview);
  }

  async submitAiAttempt(
    interviewId: string,
    dto: SubmitInterviewExerciseDto,
  ) {
    const interview = await this.getDocument(interviewId);
    await this.assertStage(interview, "ai");
    interview.aiExercise = await this.runExercise(interview.aiExercise, dto.solution);
    interview.markModified("aiExercise");
    await interview.save();
    return this.serialize(interview);
  }

  async completeAi(interviewId: string) {
    const interview = await this.getDocument(interviewId);
    await this.assertStage(interview, "ai");
    if (interview.aiExercise.attempts < 1) {
      throw new BadRequestException("Сначала запусти решение по тестам");
    }
    if (!interview.aiMessages.some((message) => message.role === "user")) {
      throw new BadRequestException("Задай AI хотя бы один вопрос по решению");
    }
    interview.defenseQuestions = await this.defenseOrFallback(interview);
    interview.defenseAnswers = interview.defenseQuestions.map(() => "");
    interview.currentStage = "defense";
    interview.markModified("defenseQuestions");
    interview.markModified("defenseAnswers");
    await interview.save();
    return this.serialize(interview);
  }

  async updateDefenseAnswer(
    interviewId: string,
    index: number,
    dto: UpdateInterviewDefenseAnswerDto,
  ) {
    const interview = await this.getDocument(interviewId);
    await this.assertStage(interview, "defense");
    if (!Number.isInteger(index) || index < 0 || index >= interview.defenseQuestions.length) {
      throw new NotFoundException("Вопрос защиты не найден");
    }
    interview.defenseAnswers[index] = dto.answer.trim();
    interview.markModified("defenseAnswers");
    await interview.save();
    return this.serialize(interview);
  }

  async complete(interviewId: string) {
    const interview = await this.getDocument(interviewId);
    if (interview.status === "completed") {
      await this.recordSignal(interview);
      return this.serialize(interview);
    }
    const expired = await this.markExpiredIfNeeded(interview);
    if (!expired) await this.assertStage(interview, "defense");
    if (!expired && interview.defenseAnswers.some((answer) => !answer.trim())) {
      throw new BadRequestException("Ответь на все вопросы защиты");
    }
    interview.status = "evaluating";
    await interview.save();
    try {
      const completedCount = await this.interviewModel.countDocuments({
        status: "completed",
      });
      const generated = await this.evaluationOrFallback(interview);
      const codingScore = scoreExercise(interview.codingExercise);
      const aiTaskScore = scoreExercise(interview.aiExercise);
      const aiScore = interview.kind === "exam"
        ? null
        : generated.assessed
          ? clampScore((generated.aiScore + aiTaskScore) / 2)
          : aiTaskScore;
      const measuredSections = [
        ...(generated.assessed
          ? [{ score: generated.platformScore, weight: interview.kind === "exam" ? 0.4 : 0.3 }]
          : []),
        { score: codingScore, weight: interview.kind === "exam" ? 0.4 : 0.3 },
        ...(aiScore === null ? [] : [{ score: aiScore, weight: 0.25 }]),
        ...(generated.assessed
          ? [{ score: generated.communicationScore, weight: interview.kind === "exam" ? 0.2 : 0.15 }]
          : []),
      ];
      const overallScore = weightedScore(measuredSections);
      const assessmentSource = generated.assessed
        ? "mixed"
        : "deterministic";
      interview.evaluation = {
        overallScore,
        assessmentSource,
        readinessConfidence: generated.assessed
          ? getReadinessConfidence(completedCount)
          : "low",
        summary: generated.summary,
        strengths: generated.strengths,
        weakTopics: generated.weakTopics,
        recommendations: generated.recommendations,
        sections: {
          platform: {
            score: generated.assessed ? generated.platformScore : null,
            assessed: generated.assessed,
            source: generated.assessed ? "ai" : "unassessed",
            feedback: generated.platformFeedback,
          },
          coding: {
            score: codingScore,
            assessed: true,
            source: "deterministic",
            feedback: interview.codingExercise.result?.passed
              ? "Решение прошло все серверные тесты."
              : `Пройдено ${interview.codingExercise.result?.passedCount ?? 0} из ${interview.codingExercise.result?.totalCount ?? 0} тестов.`,
          },
          ai: {
            score: aiScore,
            assessed: interview.kind !== "exam",
            source: interview.kind === "exam"
              ? "unassessed"
              : generated.assessed
                ? "mixed"
                : "deterministic",
            feedback: interview.kind === "exam"
              ? "AI-помощь была отключена на время экзамена."
              : generated.assessed
                ? generated.aiFeedback
                : "Оценены только результаты серверных тестов; AI-разбор недоступен.",
          },
          communication: {
            score: generated.assessed ? generated.communicationScore : null,
            assessed: generated.assessed,
            source: generated.assessed ? "ai" : "unassessed",
            feedback: generated.communicationFeedback,
          },
        },
      } satisfies InterviewSessionEvaluation;
      interview.status = "completed";
      interview.currentStage = "completed";
      interview.completedAt = new Date();
      interview.markModified("evaluation");
      await interview.save();
      await this.recordSignal(interview);
      return this.serialize(interview);
    } catch (error) {
      interview.status = "in_progress";
      await interview.save();
      throw error;
    }
  }

  async transcribe(
    interviewId: string,
    audio: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const interview = await this.getDocument(interviewId);
    if (interview.status === "completed") {
      throw new BadRequestException("Интервью уже завершено");
    }
    if (await this.markExpiredIfNeeded(interview)) {
      throw new BadRequestException("Время экзамена истекло");
    }
    const text = await this.aiContent.transcribeAudio(
      audio.buffer,
      audio.originalname || "interview-answer.webm",
      audio.mimetype || "audio/webm",
    );
    return { text };
  }

  private async runExercise(exercise: InterviewExercise, solution: string) {
    const result = await runPracticeSolution(exercise.runner, solution.trim());
    return {
      ...exercise,
      solution,
      result,
      attempts: exercise.attempts + 1,
    };
  }

  private async assessAnswerOrFallback(
    input: Parameters<AiAgentService["assessInterviewAnswer"]>[0],
  ): Promise<InterviewAnswerOutcome> {
    const fallback: InterviewAnswerOutcome = {
      score: null,
      confidence: "low",
      strengths: ["Ответ зафиксирован"],
      gaps: ["Содержательная AI-оценка временно недоступна"],
      followUpQuestion: input.followUpCount === 0 ? FOLLOW_UP_FALLBACK : null,
      nextQuestionId: input.candidateQuestions[0]?.id ?? null,
      assessed: false,
      unavailableReason: "ai_unavailable",
    };
    if (!this.agents.enabled) return fallback;
    try {
      return {
        ...await this.agents.assessInterviewAnswer(input),
        assessed: true,
        unavailableReason: null,
      };
    } catch (error) {
      this.logFallback("answer_assessment", error);
      return fallback;
    }
  }

  private async defenseOrFallback(interview: InterviewSessionDocument) {
    if (!this.aiContent.enabled) return DEFENSE_FALLBACK;
    try {
      return await this.aiContent.generateInterviewDefenseQuestions({
        task: interview.kind === "exam"
          ? interview.codingExercise.statement
          : interview.aiExercise.statement,
        solution: interview.kind === "exam"
          ? interview.codingExercise.solution
          : interview.aiExercise.solution,
        messages: interview.kind === "exam"
          ? []
          : interview.aiMessages.map(({ role, content }) => ({ role, content })),
      });
    } catch (error) {
      this.logFallback("defense", error);
      return DEFENSE_FALLBACK;
    }
  }

  private async evaluationOrFallback(
    interview: InterviewSessionDocument,
  ): Promise<InterviewEvaluationOutcome> {
    const fallback: InterviewEvaluationOutcome = {
      platformScore: null,
      aiScore: null,
      communicationScore: null,
      summary: "Сессия завершена. Для точной AI-оценки повтори её при доступном AI.",
      strengths: ["Сессия пройдена до конца", "Код проверен серверными тестами"],
      weakTopics: [],
      recommendations: [
        "Повтори слабые темы и сформулируй ответы вслух",
        "Разбери непройденные тесты обеих задач",
      ],
      platformFeedback: "Автоматическая содержательная оценка временно недоступна.",
      aiFeedback: "Проверь, какие советы AI были приняты и как они валидировались.",
      communicationFeedback: "Повтори защиту решения с таймером и структурой тезис → пример → вывод.",
      assessed: false,
    };
    if (!this.aiContent.enabled) return fallback;
    try {
      return {
        ...await this.aiContent.evaluateInterviewSession({
        company: interviewCompanyLabel(interview.company),
        mode: interview.mode,
        examMode: interview.kind === "exam",
        platform: interview.platformItems,
        coding: {
          statement: interview.codingExercise.statement,
          solution: interview.codingExercise.solution,
          result: interview.codingExercise.result,
        },
        aiSection: {
          statement: interview.aiExercise.statement,
          solution: interview.aiExercise.solution,
          result: interview.aiExercise.result,
          messages: interview.aiMessages,
        },
        defense: interview.defenseQuestions.map((question, index) => ({
          question,
          answer: interview.defenseAnswers[index],
        })),
        }),
        assessed: true,
      };
    } catch (error) {
      this.logFallback("evaluation", error);
      return fallback;
    }
  }

  private async recordSignal(interview: InterviewSessionDocument) {
    if (!interview.evaluation) return;
    const skillKeys = inferSkillKeys(
      ...interview.evaluation.weakTopics,
      ...interview.platformItems.flatMap((item) => [item.question.category, item.question.prompt]),
      interview.codingExercise.title,
      interview.codingExercise.statement,
      interview.aiExercise.title,
      interview.aiExercise.statement,
    );
    const skillIds = resolveSkillIds(skillKeys, String(interview._id), {
      weakTopics: interview.evaluation.weakTopics,
    });
    const sectionCriteria: AssessmentCriterionDraft[] = [];
    if (interview.evaluation.sections.platform.score !== null) {
      sectionCriteria.push({
        criterionId: "interview:platform",
        rubricVersion: "interview-session-v2",
        capability: "explain",
        score: interview.evaluation.sections.platform.score,
        reliability: 0.6,
      });
    }
    if (interview.evaluation.sections.coding.score !== null) {
      sectionCriteria.push({
        criterionId: "interview:coding",
        rubricVersion: "interview-session-v2",
        capability: "code",
        score: interview.evaluation.sections.coding.score,
        reliability: 1,
      });
    }
    if (interview.evaluation.sections.ai.score !== null) {
      sectionCriteria.push({
        criterionId: "interview:ai",
        rubricVersion: "interview-session-v2",
        capability: "apply",
        score: interview.evaluation.sections.ai.score,
        reliability: 0.8,
      });
    }
    if (interview.evaluation.sections.communication.score !== null) {
      sectionCriteria.push({
        criterionId: "interview:communication",
        rubricVersion: "interview-session-v2",
        capability: "defend",
        score: interview.evaluation.sections.communication.score,
        reliability: 0.6,
      });
    }
    await this.signals.record({
      type: "mock_completed",
      skillKeys: inferSkillKeys(...interview.evaluation.weakTopics),
      payload: {
        score: interview.evaluation.overallScore,
        assessmentSource: interview.evaluation.assessmentSource,
        reliability: interview.evaluation.assessmentSource === "deterministic" ? 0.6 : 1,
        weakTopics: interview.evaluation.weakTopics,
        interviewSession: true,
        itemFamilyId: `interview:${String(interview._id)}`,
        transferLevel: "far_transfer",
        sections: {
          platform: interview.evaluation.sections.platform.score,
          coding: interview.evaluation.sections.coding.score,
          ai: interview.evaluation.sections.ai.score,
          communication: interview.evaluation.sections.communication.score,
        },
      },
      operationId: `interview:${String(interview._id)}`,
      occurredAt: interview.completedAt ?? new Date(),
      nativeAssessment: {
        source: {
          kind: "interview_session",
          itemId: String(interview._id),
          itemVersion: "interview-session-v2",
          itemFamilyId: `interview:${String(interview._id)}`,
          track: null,
        },
        observations: buildAssessmentObservations(skillIds, sectionCriteria),
        transferLevel: "far_transfer",
        assistance: {
          mode: interview.kind === "exam" ? "no_ai" : "unknown",
          hintCount: 0,
          solutionViewed: false,
        },
        evaluator: {
          type: interview.evaluation.assessmentSource === "deterministic" ? "deterministic" : "mixed",
          evaluatorVersion: "interview-session-v2",
          model: null,
          promptVersion: "interview-session-evaluation-v1",
          schemaVersion: "2",
        },
      },
    });
  }

  private async assertStage(
    interview: InterviewSessionDocument,
    stage: InterviewSessionStage,
  ) {
    if (await this.markExpiredIfNeeded(interview)) {
      throw new BadRequestException("Время экзамена истекло. Получи итоговую оценку");
    }
    if (interview.status !== "in_progress" || interview.currentStage !== stage) {
      throw new BadRequestException("Этот этап интервью уже завершён");
    }
  }

  private async markExpiredIfNeeded(interview: InterviewSessionDocument) {
    if (interview.kind !== "exam" || interview.status === "completed") return false;
    const deadlineAt = interview.deadlineAt ?? new Date(
      interview.startedAt.getTime() + interview.durationMinutes * 60_000,
    );
    if (deadlineAt.getTime() > Date.now()) return false;
    if (!interview.expiredAt) {
      interview.deadlineAt = deadlineAt;
      interview.expiredAt = new Date();
      await interview.save();
    }
    return true;
  }

  private async getDocument(interviewId: string) {
    if (!isValidObjectId(interviewId)) {
      throw new NotFoundException("Интервью не найдено");
    }
    const interview = await this.interviewModel.findById(interviewId).exec();
    if (!interview) throw new NotFoundException("Интервью не найдено");
    return interview;
  }

  private async serialize(interview: InterviewSession & { _id: unknown }) {
    const turns = (interview.engineVersion ?? 1) === 2
      ? await this.interviewTurnModel
          .find({ interviewId: String(interview._id) })
          .sort({ sequence: 1 })
          .lean()
          .exec()
      : [];
    return serializeInterviewSession(interview, turns);
  }

  private logFallback(operation: string, error: unknown) {
    this.logger.warn({
      event: "interview_ai_fallback",
      operation,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
