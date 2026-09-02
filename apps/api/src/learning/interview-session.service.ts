import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
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
} from "./dto/learning.dto";
import { runPracticeSolution } from "./generated-runner";
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
  InterviewSession,
  type InterviewSessionDocument,
} from "./schemas/interview-session.schema";
import { inferSkillKeys } from "./skills";

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
    @InjectModel(CareerApplicationEntry.name)
    private readonly careerApplicationModel: Model<CareerApplicationEntry>,
    private readonly aiContent: AiContentService,
    private readonly agents: AiAgentService,
    private readonly signals: LearningSignalService,
  ) {}

  async getCurrent() {
    const interview = await this.interviewModel
      .findOne({ status: { $in: ["in_progress", "evaluating"] } })
      .sort({ updatedAt: -1 })
      .exec();
    if (interview) await this.markExpiredIfNeeded(interview);
    return interview ? serializeInterviewSession(interview) : null;
  }

  async list(limit = 10) {
    const interviews = await this.interviewModel
      .find({ status: "completed" })
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return interviews.map(serializeInterviewSession);
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
    const interview = await this.interviewModel.create({
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
    });
    return serializeInterviewSession(interview);
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
    return serializeInterviewSession(interview);
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
    return serializeInterviewSession(interview);
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
    return serializeInterviewSession(interview);
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
    return serializeInterviewSession(interview);
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
    return serializeInterviewSession(interview);
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
    return serializeInterviewSession(interview);
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
    return serializeInterviewSession(interview);
  }

  async complete(interviewId: string) {
    const interview = await this.getDocument(interviewId);
    if (interview.status === "completed") {
      await this.recordSignal(interview);
      return serializeInterviewSession(interview);
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
      return serializeInterviewSession(interview);
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
    await this.signals.record({
      type: "mock_completed",
      skillKeys: inferSkillKeys(...interview.evaluation.weakTopics),
      payload: {
        score: interview.evaluation.overallScore,
        assessmentSource: interview.evaluation.assessmentSource,
        reliability: interview.evaluation.assessmentSource === "deterministic" ? 0.6 : 1,
        weakTopics: interview.evaluation.weakTopics,
        interviewSession: true,
        sections: {
          platform: interview.evaluation.sections.platform.score,
          coding: interview.evaluation.sections.coding.score,
          ai: interview.evaluation.sections.ai.score,
          communication: interview.evaluation.sections.communication.score,
        },
      },
      operationId: `interview:${String(interview._id)}`,
      occurredAt: interview.completedAt ?? new Date(),
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

  private logFallback(operation: string, error: unknown) {
    this.logger.warn({
      event: "interview_ai_fallback",
      operation,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
