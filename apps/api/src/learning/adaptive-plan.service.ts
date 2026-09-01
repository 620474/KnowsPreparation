import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  AdaptivePlan,
  AdaptivePlanItem,
  AdaptivePlanCheckIn,
  SkillKey,
  TrackKey,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { AiAgentService } from "../agents/ai-agent.service";
import { CareerApplicationEntry } from "../career/schemas/career-application.schema";
import { CURRICULUM, QUESTION_BANK } from "./curriculum";
import { inferSkillKeys } from "./skills";
import { LearningSignalService } from "./learning-signal.service";
import { AiCourse, AiLesson } from "./schemas/ai-course.schema";
import { AdaptiveDayPlan } from "./schemas/adaptive-day-plan.schema";
import { AiQuizProgress } from "./schemas/ai-quiz-progress.schema";
import { LearningSignal } from "./schemas/learning-signal.schema";
import { MockInterview } from "./schemas/mock-interview.schema";
import { PracticeAttempt } from "./schemas/practice-attempt.schema";
import { QuestionProgress } from "./schemas/question-progress.schema";
import { Settings } from "./schemas/settings.schema";
import { TaskProgress } from "./schemas/task-progress.schema";
import {
  findStaticTrackByCourse,
  getStaticTrackItem,
  isStaticTrackKey,
} from "./track-registry";

const DAY_MS = 86_400_000;

const dateKey = (value: Date) => value.toISOString().slice(0, 10);

const recommendationId = (
  date: string,
  kind: AdaptivePlanItem["kind"],
  track: TrackKey | null,
  itemId: string | null,
  source: AdaptivePlanItem["source"],
) => [date, kind, track ?? "all", itemId ?? "all", source ?? "none"].join(":");

export function selectAdaptivePlanItems(
  candidates: AdaptivePlanItem[],
  budgetMinutes: number,
  skippedIds: Set<string> = new Set(),
) {
  const selected: AdaptivePlanItem[] = [];
  let usedMinutes = 0;
  for (const candidate of [...candidates].sort(
    (left, right) => right.score - left.score || left.minutes - right.minutes,
  )) {
    if (skippedIds.has(candidate.id) || selected.some((item) => item.id === candidate.id)) {
      continue;
    }
    if (usedMinutes + candidate.minutes > budgetMinutes) continue;
    selected.push(candidate);
    usedMinutes += candidate.minutes;
  }
  return selected;
}

@Injectable()
export class AdaptivePlanService {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(TaskProgress.name) private readonly taskModel: Model<TaskProgress>,
    @InjectModel(QuestionProgress.name)
    private readonly questionModel: Model<QuestionProgress>,
    @InjectModel(PracticeAttempt.name)
    private readonly attemptModel: Model<PracticeAttempt>,
    @InjectModel(AiQuizProgress.name)
    private readonly quizModel: Model<AiQuizProgress>,
    @InjectModel(AiLesson.name) private readonly lessonModel: Model<AiLesson>,
    @InjectModel(AiCourse.name) private readonly courseModel: Model<AiCourse>,
    @InjectModel(MockInterview.name)
    private readonly mockModel: Model<MockInterview>,
    @InjectModel(LearningSignal.name)
    private readonly signalModel: Model<LearningSignal>,
    @InjectModel(AdaptiveDayPlan.name)
    private readonly dayPlanModel: Model<AdaptiveDayPlan>,
    @InjectModel(CareerApplicationEntry.name)
    private readonly careerApplicationModel: Model<CareerApplicationEntry>,
    private readonly signals: LearningSignalService,
    private readonly agents: AiAgentService,
  ) {}

  async skipRecommendation(recommendationId: string, operationId: string) {
    await this.signals.record({
      type: "recommendation_skipped",
      payload: { recommendationId },
      operationId: `skip:${operationId}`,
    });
    return { skipped: true };
  }

  async getToday(now = new Date(), checkIn?: AdaptivePlanCheckIn): Promise<AdaptivePlan> {
    const date = dateKey(now);
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const [
      settings,
      tasks,
      questions,
      attempts,
      quizzes,
      lessons,
      aiCourse,
      latestMock,
      latestMockSignal,
      careerApplications,
      skippedSignals,
    ] = await Promise.all([
      this.settingsModel.findOne({ key: "main" }).lean().exec(),
      this.taskModel.find().lean().exec(),
      this.questionModel.find().lean().exec(),
      this.attemptModel.find().sort({ createdAt: -1 }).limit(300).lean().exec(),
      this.quizModel.find().sort({ updatedAt: -1 }).lean().exec(),
      this.lessonModel.find().lean().exec(),
      this.courseModel.findOne({ key: "main" }).lean().exec(),
      this.mockModel.findOne({ status: "completed" }).sort({ completedAt: -1 }).lean().exec(),
      this.signalModel
        .findOne({ type: "mock_completed" })
        .sort({ occurredAt: -1 })
        .lean()
        .exec(),
      this.careerApplicationModel
        .find({ stage: { $nin: ["offer", "rejected", "withdrawn"] } })
        .sort({ priority: -1, updatedAt: -1 })
        .limit(20)
        .lean()
        .exec(),
      this.signalModel
        .find({ type: "recommendation_skipped", occurredAt: { $gte: startOfDay } })
        .lean()
        .exec(),
    ]);
    const budgetMinutes = settings?.dailyMinutes ?? 120;
    const candidates: AdaptivePlanItem[] = [];
    const taskMap = new Map(tasks.map((task) => [task.taskId, task]));
    const questionMap = new Map(questions.map((question) => [question.questionId, question]));
    const lessonMap = new Map(
      lessons.map((lesson) => [`${lesson.courseKey}:${lesson.courseVersion}:${lesson.itemId}`, lesson]),
    );

    const dueQuestions = QUESTION_BANK.filter((question) => {
      const progress = questionMap.get(question.id);
      if (!progress) return false;
      return progress.status !== "new" &&
        (!progress.nextReviewAt || progress.nextReviewAt.getTime() <= now.getTime());
    });
    const freshQuestions = QUESTION_BANK
      .filter((question) => !questionMap.has(question.id))
      .slice(0, 5);
    const reviewQuestions = [...dueQuestions, ...freshQuestions];
    if (reviewQuestions.length > 0) {
      const skills = [...new Set(reviewQuestions.flatMap((question) =>
        inferSkillKeys(question.category, question.prompt),
      ))];
      candidates.push({
        id: recommendationId(date, "review", null, null, null),
        kind: "review",
        title: "Интервальное повторение",
        reason: `${reviewQuestions.length} вопросов готовы к повторению`,
        minutes: Math.min(30, Math.max(10, reviewQuestions.length * 5)),
        score: 110 + dueQuestions.length * 3,
        skillKeys: skills,
        track: null,
        itemId: null,
        source: null,
      });
    }

    const latestAttempts = new Map<string, (typeof attempts)[number]>();
    for (const attempt of attempts) {
      const key = `${attempt.track}:${attempt.itemId}:${attempt.source}`;
      if (!latestAttempts.has(key)) latestAttempts.set(key, attempt);
    }
    for (const attempt of latestAttempts.values()) {
      if (attempt.passed) continue;
      const title = this.resolveAttemptTitle(attempt, lessonMap);
      const missing = Math.max(1, attempt.totalCount - attempt.passedCount);
      candidates.push({
        id: recommendationId(
          date,
          "practice",
          attempt.track,
          attempt.itemId,
          attempt.source,
        ),
        kind: "practice",
        title,
        reason: `Последняя попытка: ${attempt.passedCount}/${attempt.totalCount} тестов`,
        minutes: 30,
        score: 95 + missing * 5,
        skillKeys: (attempt.skillKeys?.length ?? 0) > 0
          ? attempt.skillKeys
          : this.resolveAttemptSkills(attempt, title),
        track: attempt.track,
        itemId: attempt.itemId,
        source: attempt.source,
      });
    }

    for (const progress of quizzes) {
      const latest = progress.attempts.at(-1);
      if (!latest || latest.score >= 8) continue;
      const track = this.resolveTrack(progress.courseKey, progress.courseVersion, aiCourse);
      if (!track) continue;
      const lesson = lessonMap.get(
        `${progress.courseKey}:${progress.courseVersion}:${progress.itemId}`,
      );
      const wrongTopics = latest.answers
        .filter((answer) => !answer.correct)
        .map((answer) => answer.topic);
      candidates.push({
        id: recommendationId(date, "lesson", track, progress.itemId, "lesson"),
        kind: "lesson",
        title: lesson?.title ?? "Повторить разбор темы",
        reason: `Квиз: ${latest.score}/10 · ошибки: ${wrongTopics.slice(0, 2).join(", ")}`,
        minutes: 20,
        score: 75 + (10 - latest.score) * 4,
        skillKeys: inferSkillKeys(...wrongTopics, lesson?.title),
        track,
        itemId: progress.itemId,
        source: "lesson",
      });
    }

    const nextBlock = CURRICULUM
      .flatMap((week) => week.days)
      .flatMap((day) => day.blocks)
      .find((block) => !taskMap.get(block.id)?.completed);
    if (nextBlock) {
      candidates.push({
        id: recommendationId(date, "plan", "curriculum", nextBlock.id, null),
        kind: "plan",
        title: nextBlock.title,
        reason: "Следующий незакрытый блок основной программы",
        minutes: nextBlock.minutes,
        score: 55,
        skillKeys: inferSkillKeys(nextBlock.title, nextBlock.description),
        track: "curriculum",
        itemId: nextBlock.id,
        source: null,
      });
    }

    const lastMockAt = Math.max(
      latestMock?.completedAt?.getTime() ?? 0,
      latestMockSignal?.occurredAt?.getTime() ?? 0,
    );
    if (!lastMockAt || now.getTime() - lastMockAt >= 7 * DAY_MS) {
      candidates.push({
        id: recommendationId(date, "mock", null, null, null),
        kind: "mock",
        title: "Мок-интервью",
        reason: lastMockAt
          ? "После последнего мока прошла неделя"
          : "Нужна первая контрольная точка",
        minutes: 20,
        score: 45,
        skillKeys: latestMockSignal?.skillKeys.length
          ? latestMockSignal.skillKeys
          : latestMock?.evaluation
            ? inferSkillKeys(...latestMock.evaluation.weakTopics)
            : ["javascript", "react"],
        track: null,
        itemId: null,
        source: null,
      });
    }

    for (const application of careerApplications) {
      const highGaps = application.analysis?.gaps.filter(
        (gap) => gap.severity === "high",
      ) ?? [];
      const upcomingInterview = application.interviews.find((interview) =>
        interview.status === "planned" &&
        Boolean(interview.scheduledAt) &&
        new Date(interview.scheduledAt ?? "").getTime() <= now.getTime() + 14 * DAY_MS,
      );
      const followUpDue = Boolean(
        application.followUpAt &&
        new Date(`${application.followUpAt}T23:59:59.999Z`).getTime() <= now.getTime(),
      );
      if (!highGaps.length && !upcomingInterview && !followUpDue) continue;
      const reason = upcomingInterview
        ? `Подготовка к интервью: ${upcomingInterview.type}`
        : highGaps.length
          ? `Критичные пробелы вакансии: ${highGaps.length}`
          : "Пора сделать follow-up";
      candidates.push({
        id: recommendationId(date, "career", null, application.applicationId, null),
        kind: "career",
        title: `${application.company} · ${application.role}`,
        reason,
        minutes: upcomingInterview || highGaps.length ? 25 : 10,
        score: 70 + highGaps.length * 6 + (upcomingInterview ? 20 : 0),
        skillKeys: highGaps.length
          ? [...new Set(highGaps.flatMap((gap) => gap.skillKeys))]
          : [],
        track: null,
        itemId: application.applicationId,
        source: null,
      });
    }

    const skippedIds = new Set(
      skippedSignals.flatMap((signal) =>
        typeof signal.payload.recommendationId === "string"
          ? [signal.payload.recommendationId]
          : [],
      ),
    );
    const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    if (!checkIn) {
      const cached = await this.dayPlanModel.findOne({ date }).lean().exec();
      if (cached) {
        const items = cached.items.filter(
          (item) => candidateMap.has(item.id) && !skippedIds.has(item.id),
        );
        return {
          date,
          budgetMinutes: cached.checkIn.availableMinutes,
          totalMinutes: items.reduce((sum, item) => sum + item.minutes, 0),
          generatedAt: cached.updatedAt.toISOString(),
          strategy: cached.strategy,
          rationale: cached.rationale,
          checkIn: cached.checkIn,
          items,
        };
      }
    }

    const effectiveCheckIn = checkIn ?? {
      availableMinutes: budgetMinutes,
      energy: "normal",
      focus: "mixed",
      note: "",
    };
    const availableCandidates = candidates.filter((candidate) => !skippedIds.has(candidate.id));
    let items = selectAdaptivePlanItems(
      availableCandidates,
      effectiveCheckIn.availableMinutes,
    );
    let strategy: "ai" | "deterministic" = "deterministic";
    let rationale = "План собран по срочности, результатам тестов и срокам.";
    if (checkIn && this.agents.enabled && availableCandidates.length > 0) {
      try {
        const generated = await this.agents.orderAdaptivePlan({
          checkIn: effectiveCheckIn,
          candidates: availableCandidates,
        });
        items = generated.items;
        rationale = generated.rationale;
        strategy = "ai";
      } catch {
        rationale = "AI-планировщик недоступен — применён проверенный порядок по приоритетам.";
      }
    }

    if (checkIn) {
      const fingerprint = createHash("sha256")
        .update(JSON.stringify({
          checkIn: effectiveCheckIn,
          candidates: availableCandidates.map(({ id, score, minutes }) => ({ id, score, minutes })),
        }))
        .digest("hex");
      await this.dayPlanModel.findOneAndUpdate(
        { date },
        {
          $set: {
            date,
            fingerprint,
            checkIn: effectiveCheckIn,
            items,
            strategy,
            rationale,
          },
        },
        { upsert: true, returnDocument: "after" },
      ).exec();
    }
    return {
      date,
      budgetMinutes: effectiveCheckIn.availableMinutes,
      totalMinutes: items.reduce((sum, item) => sum + item.minutes, 0),
      generatedAt: new Date().toISOString(),
      strategy,
      rationale,
      checkIn: effectiveCheckIn,
      items,
    };
  }

  generateToday(checkIn: AdaptivePlanCheckIn) {
    return this.getToday(new Date(), checkIn);
  }

  private resolveTrack(
    courseKey: string,
    courseVersion: number,
    aiCourse: AiCourse | null,
  ): TrackKey | null {
    const staticTrack = findStaticTrackByCourse(courseKey, courseVersion);
    if (staticTrack) return staticTrack.key;
    return aiCourse?.key === courseKey && aiCourse.version === courseVersion
      ? "course"
      : null;
  }

  private resolveAttemptTitle(
    attempt: PracticeAttempt,
    lessonMap: Map<string, AiLesson>,
  ) {
    if (attempt.source === "task" && isStaticTrackKey(attempt.track)) {
      try {
        return getStaticTrackItem(attempt.track, attempt.itemId).block.title;
      } catch {
        return "Вернуться к задаче";
      }
    }
    return lessonMap.get(
      `${attempt.courseKey}:${attempt.courseVersion}:${attempt.itemId}`,
    )?.practice.title ?? "Доработать практику урока";
  }

  private resolveAttemptSkills(attempt: PracticeAttempt, title: string): SkillKey[] {
    if (attempt.source === "task" && isStaticTrackKey(attempt.track)) {
      try {
        const block = getStaticTrackItem(attempt.track, attempt.itemId).block;
        return inferSkillKeys(block.title, block.description);
      } catch {
        return inferSkillKeys(title);
      }
    }
    return inferSkillKeys(title);
  }
}
