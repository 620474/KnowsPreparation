import { createHash, randomUUID } from "node:crypto";
import {
  questionAttemptResultSchema,
  type ReviewRating,
  type SkillCapability,
} from "@prep/contracts";

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";

import { AiAgentService } from "../agents/ai-agent.service";

import { AiContentService, type AiDeltaHandler } from "./ai-content.service";
import {
  buildAiChatContext,
  buildTrackAiChatContext,
} from "./ai-chat";
import {
  selectResourcesForCourseItem,
  type GeneratedLesson,
  type GeneratedLessonReviewIssue,
} from "./ai-course";
import {
  CURRICULUM_BUFFER_WEEKS,
  CURRICULUM_CORE_WEEKS,
  QUESTION_BANK,
  QUESTION_IDS,
  TASK_IDS,
} from "./curriculum";
import { RESOURCES } from "./resources";
import {
  CreateAlgorithmDto,
  GenerateAiCourseDto,
  ListPracticeAttemptsDto,
  ReviewQuestionDto,
  SubmitQuestionAttemptDto,
  SendAiChatMessageDto,
  SubmitLessonQuizDto,
  SubmitPracticeAttemptDto,
  UpdateMockAnswerDto,
  UpdatePracticeSolutionDto,
  UpdateQuestionDto,
  UpdateSettingsDto,
  UpdateTaskDto,
} from "./dto/learning.dto";
import { selectMockInterviewQuestions } from "./mock-interview";
import {
  MAX_GENERATION_ATTEMPTS,
  omitReferenceSolution,
  runPracticeSolution,
  validateGeneratedRunner,
} from "./generated-runner";
import { LearningCleanupService } from "./learning-cleanup.service";
import { LearningSignalService } from "./learning-signal.service";
import { normalizeSkillCapability } from "./evidence/evidence-capabilities";
import { buildAssessmentObservations } from "./evidence/native-assessment";
import {
  serializeAiCourse,
  serializeAiLesson,
  serializeMockInterview,
  serializePracticeAttempt,
  serializePracticeProgress,
  serializeQuestionProgress,
  serializeQuizProgress,
} from "./learning-serialization";
import { AlgorithmEntry } from "./schemas/algorithm-entry.schema";
import { AiChatMessage } from "./schemas/ai-chat-message.schema";
import { AiCourse, AiLesson } from "./schemas/ai-course.schema";
import { AiPracticeProgress } from "./schemas/ai-practice-progress.schema";
import { AiQuizProgress } from "./schemas/ai-quiz-progress.schema";
import { MockInterview } from "./schemas/mock-interview.schema";
import { QuestionProgress } from "./schemas/question-progress.schema";
import { PracticeAttempt } from "./schemas/practice-attempt.schema";
import { QuestionAttempt } from "./schemas/question-attempt.schema";
import { Settings } from "./schemas/settings.schema";
import { TaskProgress } from "./schemas/task-progress.schema";
import { inferSkillKeys } from "./skills";
import { resolveSkillIds } from "./skills/skill-resolver";
import { scheduleQuestionReview } from "./spaced-repetition";
import { getQuestionTraining } from "./question-training";
import { buildTaskProgressUpdate } from "./task-progress";
import {
  getStaticTrackItem,
  isStaticTrackKey,
  SPRINT_TASK_IDS,
  type StaticTrackKey,
  type TrackKey,
} from "./track-registry";

interface AiChatMessageRecord {
  _id: unknown;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

interface AiChatScope {
  courseKey: string;
  courseVersion: number;
  itemId: string;
  title: string;
  context: string;
}

interface LessonReviewContext {
  track: string;
  title: string;
  objective: string;
}

interface ReviewedRunnableLesson {
  generationModel: string;
  reviewModel: string;
  reviewStatus: "approved" | "revised";
  reviewScore: number;
  reviewIssues: GeneratedLessonReviewIssue[];
  reviewedAt: string;
  sourceVerificationStatus: "verified" | "partial";
  sourceVerificationScore: number;
  sourceVerificationModel: string;
  sourceVerificationIssues: Array<{
    severity: "warning" | "critical";
    claim: string;
    message: string;
    sourceUrls: string[];
    location?: "explanation" | "code_example" | "diagram" | "practice" | "quiz" | "summary";
    excerpt?: string;
  }>;
  verifiedSources: Array<{ title: string; url: string }>;
  sourceVerifiedAt: string;
}

const normalizeExpectedAnswer = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/[`'"“”«»]/g, "")
    .replace(/\s*(?:→|->|,|;|\n)\s*/g, ",")
    .replace(/\s+/g, "")
    .replace(/,+/g, ",")
    .replace(/^,|,$/g, "");

const automaticRating = (
  passed: boolean,
  score: number,
  confidence: number,
  responseTimeMs: number,
  expectedSeconds: number,
): ReviewRating => {
  if (!passed) return score >= 40 ? "hard" : "again";
  const calibrated = Math.abs(confidence - score) <= 20;
  return score >= 90 && calibrated && responseTimeMs <= expectedSeconds * 1_000
    ? "easy"
    : "good";
};

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(TaskProgress.name) private readonly taskModel: Model<TaskProgress>,
    @InjectModel(QuestionProgress.name)
    private readonly questionModel: Model<QuestionProgress>,
    @InjectModel(QuestionAttempt.name)
    private readonly questionAttemptModel: Model<QuestionAttempt>,
    @InjectModel(AlgorithmEntry.name)
    private readonly algorithmModel: Model<AlgorithmEntry>,
    @InjectModel(AiCourse.name) private readonly aiCourseModel: Model<AiCourse>,
    @InjectModel(AiLesson.name) private readonly aiLessonModel: Model<AiLesson>,
    @InjectModel(AiChatMessage.name)
    private readonly aiChatMessageModel: Model<AiChatMessage>,
    @InjectModel(AiQuizProgress.name)
    private readonly aiQuizProgressModel: Model<AiQuizProgress>,
    @InjectModel(AiPracticeProgress.name)
    private readonly aiPracticeProgressModel: Model<AiPracticeProgress>,
    @InjectModel(PracticeAttempt.name)
    private readonly practiceAttemptModel: Model<PracticeAttempt>,
    @InjectModel(MockInterview.name)
    private readonly mockInterviewModel: Model<MockInterview>,
    private readonly aiContent: AiContentService,
    private readonly agents: AiAgentService,
    private readonly cleanup: LearningCleanupService,
    private readonly signals: LearningSignalService,
  ) {}

  async generateAiCourse(dto: GenerateAiCourseDto) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const deadline = new Date(`${dto.deadline}T00:00:00.000Z`);
    const remainingDays = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
    const lessonCount = Math.min(21, Math.max(7, remainingDays));
    const generated = await this.aiContent.generateCourse(dto, lessonCount);
    const current = await this.aiCourseModel.findOne({ key: "main" }).lean().exec();
    const version = (current?.version ?? 0) + 1;
    const generatedAt = new Date().toISOString();
    const items = generated.lessons.map((item, index) => ({
      id: `lesson-${String(index + 1).padStart(2, "0")}`,
      title: item.title,
      objective: item.objective,
      estimatedMinutes: item.estimatedMinutes,
      resourceIds: selectResourcesForCourseItem(item, RESOURCES),
    }));
    const course = await this.aiCourseModel
      .findOneAndUpdate(
        { key: "main" },
        {
          $set: {
            key: "main",
            title: generated.title,
            summary: generated.summary,
            goal: dto.goal,
            level: dto.level,
            deadline: dto.deadline,
            dailyMinutes: dto.dailyMinutes,
            targetCompanies: dto.targetCompanies,
            weakTopics: dto.weakTopics,
            version,
            generatedAt,
            items,
          },
        },
        { upsert: true, returnDocument: "after", lean: true },
      )
      .exec();

    if (!course) {
      throw new InternalServerErrorException("Не удалось сохранить AI-курс");
    }
    await this.pruneQuietly("course", () =>
      this.cleanup.pruneCourseVersions(course.key, course.version),
    );
    return serializeAiCourse(course);
  }

  /**
   * Уборка устаревших версий не должна ломать успешную генерацию: пользователь
   * получает урок, а сбой очистки попадает в логи.
   */
  private async pruneQuietly(scope: string, prune: () => Promise<unknown>) {
    try {
      await prune();
    } catch (error) {
      this.logger.warn({
        event: "version_prune_failed",
        scope,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Единая точка генерации урока для любого трека. */
  async generateTrackLesson(
    trackKey: TrackKey,
    itemId: string,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    return isStaticTrackKey(trackKey)
      ? this.generateStaticTrackLesson(trackKey, itemId, onDelta, signal)
      : this.generateCourseLesson(itemId, onDelta, signal);
  }

  private async generateCourseLesson(
    itemId: string,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    const { course, item } = await this.getCourseItem(itemId);
    const resources = this.resolveResources(item.resourceIds);
    const progressHandler = this.createSafeLessonProgressHandler(onDelta);
    const generated = await this.generateRunnableLesson(
      "course",
      {
        track: "course",
        title: item.title,
        objective: item.objective,
      },
      () => this.aiContent.generateLesson(
        {
          goal: course.goal,
          level: course.level,
          deadline: course.deadline,
          dailyMinutes: course.dailyMinutes,
          targetCompanies: course.targetCompanies,
          weakTopics: course.weakTopics,
        },
        item,
        resources,
        progressHandler,
        signal,
      ),
      signal,
    );
    const current = await this.aiLessonModel
      .findOne({ courseKey: course.key, courseVersion: course.version, itemId })
      .lean()
      .exec();
    const lesson = await this.aiLessonModel
      .findOneAndUpdate(
        { courseKey: course.key, courseVersion: course.version, itemId },
        {
          $set: {
            courseKey: course.key,
            courseVersion: course.version,
            itemId,
            title: item.title,
            ...generated,
            resourceIds: item.resourceIds,
            version: (current?.version ?? 0) + 1,
            generatedAt: new Date().toISOString(),
          },
        },
        { upsert: true, returnDocument: "after", lean: true },
      )
      .exec();

    if (!lesson) {
      throw new InternalServerErrorException("Не удалось сохранить AI-урок");
    }
    await this.pruneQuietly("course-lesson", () =>
      this.cleanup.pruneLessonVersions(
        course.key,
        course.version,
        itemId,
        lesson.version,
      ),
    );
    return serializeAiLesson(lesson);
  }

  private async generateStaticTrackLesson(
    trackKey: StaticTrackKey,
    itemId: string,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    const { track, day, block } = getStaticTrackItem(trackKey, itemId);
    if (block.kind === "review") {
      throw new BadRequestException("Для блока разбора отдельный AI-урок не требуется");
    }
    const resources = this.resolveResources(block.resourceIds);
    const progressHandler = this.createSafeLessonProgressHandler(onDelta);
    const generated = await this.generateRunnableLesson(
      track.key,
      {
        track: track.key,
        title: block.title,
        objective: block.description,
      },
      () =>
        this.aiContent.generateTrackLesson(
          track.lessonPrompt,
          day,
          block,
          resources,
          progressHandler,
          signal,
        ),
      signal,
    );
    const scope = {
      courseKey: track.courseKey,
      courseVersion: track.courseVersion,
      itemId,
    };
    const current = await this.aiLessonModel.findOne(scope).lean().exec();
    const lesson = await this.aiLessonModel
      .findOneAndUpdate(
        scope,
        {
          $set: {
            ...scope,
            title: block.title,
            ...generated,
            resourceIds: block.resourceIds,
            version: (current?.version ?? 0) + 1,
            generatedAt: new Date().toISOString(),
          },
        },
        { upsert: true, returnDocument: "after", lean: true },
      )
      .exec();

    if (!lesson) {
      throw new InternalServerErrorException(track.saveLessonError);
    }
    await this.pruneQuietly(`${track.key}-lesson`, () =>
      this.cleanup.pruneLessonVersions(
        scope.courseKey,
        scope.courseVersion,
        itemId,
        lesson.version,
      ),
    );
    return serializeAiLesson(lesson);
  }

  private resolveResources(resourceIds: string[]) {
    const resourceMap = new Map(RESOURCES.map((resource) => [resource.id, resource]));
    return resourceIds.flatMap((resourceId) => {
      const resource = resourceMap.get(resourceId);
      return resource ? [resource] : [];
    });
  }

  /** Находит тему персонального AI-курса вместе с самим курсом. */
  private async getCourseItem(itemId: string) {
    const course = await this.aiCourseModel.findOne({ key: "main" }).lean().exec();
    if (!course) {
      throw new NotFoundException("Сначала создай AI-курс");
    }
    const item = course.items.find((courseItem) => courseItem.id === itemId);
    if (!item) {
      throw new NotFoundException("Тема AI-курса не найдена");
    }
    return { course, item };
  }

  private async generateRunnableLesson(
    scope: string,
    context: LessonReviewContext,
    generate: (attempt: number) => Promise<GeneratedLesson>,
    signal?: AbortSignal,
  ) {
    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const draft = await generate(attempt);
      const draftValidation = await validateGeneratedRunner(draft);
      if (!draftValidation.valid) {
        this.logger.warn({
          event: "generated_runner_validation_failed",
          scope,
          attempt,
          stage: "generation",
          failureCount: draftValidation.failures.length,
        });
        continue;
      }

      const review = await this.aiContent.reviewGeneratedLesson(
        context,
        draft,
        signal,
      );
      if (review.verdict === "rejected") {
        this.logger.warn({
          event: "generated_lesson_review_rejected",
          scope,
          attempt,
          reviewScore: review.score,
          issueCount: review.issues.length,
        });
        continue;
      }

      const reviewedLesson = review.correctedLesson ?? draft;
      const reviewedValidation = await validateGeneratedRunner(reviewedLesson);
      if (!reviewedValidation.valid) {
        this.logger.warn({
          event: "generated_runner_validation_failed",
          scope,
          attempt,
          stage: "review",
          failureCount: reviewedValidation.failures.length,
        });
        continue;
      }

      const sourceVerification = await this.verifyLessonSources(
        scope,
        context,
        reviewedLesson,
        signal,
      );
      if (sourceVerification.status === "rejected") {
        this.logger.warn({
          event: "generated_lesson_source_rejected",
          scope,
          attempt,
          sourceScore: sourceVerification.score,
          issueCount: sourceVerification.issues.length,
        });
        continue;
      }

      return {
        ...omitReferenceSolution(reviewedLesson),
        generationModel: this.aiContent.model,
        reviewModel: this.aiContent.reviewModel,
        reviewStatus: review.verdict,
        reviewScore: review.score,
        reviewIssues: review.issues,
        reviewedAt: new Date().toISOString(),
        sourceVerificationStatus: sourceVerification.status,
        sourceVerificationScore: sourceVerification.score,
        sourceVerificationModel: this.agents.model,
        sourceVerificationIssues: sourceVerification.issues,
        verifiedSources: sourceVerification.sources,
        sourceVerifiedAt: new Date().toISOString(),
      } satisfies ReviewedRunnableLesson &
        ReturnType<typeof omitReferenceSolution>;
    }

    throw new BadGatewayException(
      "AI не смог создать и проверить корректный урок после трёх попыток. Предыдущий урок сохранён.",
    );
  }

  private async verifyLessonSources(
    scope: string,
    context: LessonReviewContext,
    lesson: GeneratedLesson,
    signal?: AbortSignal,
  ) {
    if (!this.agents.enabled) {
      return {
        status: "partial" as const,
        score: 0,
        issues: [{
          severity: "warning" as const,
          claim: "Проверка официальных источников",
          message: "AI-проверка источников не настроена.",
          sourceUrls: [],
        }],
        sources: [],
      };
    }
    try {
      return await this.agents.verifyLesson(
        { track: context.track, title: context.title, lesson },
        signal,
      );
    } catch (error) {
      this.logger.warn({
        event: "generated_lesson_source_fallback",
        scope,
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return {
        status: "partial" as const,
        score: 0,
        issues: [{
          severity: "warning" as const,
          claim: "Проверка официальных источников",
          message: "Источники временно не удалось проверить; урок сохранён после технической проверки.",
          sourceUrls: [],
        }],
        sources: [],
      };
    }
  }

  private createSafeLessonProgressHandler(onDelta?: AiDeltaHandler) {
    if (!onDelta) return undefined;
    return (delta: string) => onDelta(" ".repeat(delta.length));
  }

  async getTrackChat(trackKey: TrackKey, itemId: string) {
    return this.readAiChat(await this.resolveTrackChatScope(trackKey, itemId));
  }

  private async readAiChat(scope: AiChatScope) {
    const messages = await this.aiChatMessageModel
      .find({
        courseKey: scope.courseKey,
        courseVersion: scope.courseVersion,
        itemId: scope.itemId,
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    return {
      itemId: scope.itemId,
      title: scope.title,
      messages: messages.reverse().map((message) => this.serializeAiChatMessage(message)),
    };
  }

  async sendTrackChatMessage(
    trackKey: TrackKey,
    itemId: string,
    dto: SendAiChatMessageDto,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    return this.replyToAiChat(
      await this.resolveTrackChatScope(trackKey, itemId),
      dto,
      onDelta,
      signal,
    );
  }

  private async replyToAiChat(
    scope: AiChatScope,
    dto: SendAiChatMessageDto,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException("Сообщение не может быть пустым");
    }
    const recentMessages = await this.aiChatMessageModel
      .find({
        courseKey: scope.courseKey,
        courseVersion: scope.courseVersion,
        itemId: scope.itemId,
      })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean()
      .exec();
    const history = recentMessages.reverse().map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const reply = await this.aiContent.generateChatReply(
      scope.context,
      history,
      content,
      onDelta,
      signal,
    );
    const created = await this.aiChatMessageModel.insertMany([
      {
        courseKey: scope.courseKey,
        courseVersion: scope.courseVersion,
        itemId: scope.itemId,
        role: "user",
        content,
      },
      {
        courseKey: scope.courseKey,
        courseVersion: scope.courseVersion,
        itemId: scope.itemId,
        role: "assistant",
        content: reply,
      },
    ]);

    return {
      messages: created.map((message) => this.serializeAiChatMessage(message)),
    };
  }

  async clearTrackChat(trackKey: TrackKey, itemId: string) {
    return this.deleteAiChat(await this.resolveTrackChatScope(trackKey, itemId));
  }

  private async deleteAiChat(scope: AiChatScope) {
    await this.aiChatMessageModel
      .deleteMany({
        courseKey: scope.courseKey,
        courseVersion: scope.courseVersion,
        itemId: scope.itemId,
      })
      .exec();
    return { deleted: true };
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const update = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(update).length === 0) {
      throw new BadRequestException("Передай хотя бы одну настройку");
    }
    const insertDefaults: Record<string, unknown> = {
      key: "main",
      startDate: new Date().toISOString().slice(0, 10),
      dailyMinutes: 120,
      reminderEnabled: false,
      reminderTime: "19:00",
      adaptiveTodayEnabled: true,
    };
    for (const key of Object.keys(update)) delete insertDefaults[key];
    const settings = await this.settingsModel
      .findOneAndUpdate(
        { key: "main" },
        {
          $set: {
            ...update,
            coreWeeks: CURRICULUM_CORE_WEEKS,
            bufferWeeks: CURRICULUM_BUFFER_WEEKS,
          },
          $setOnInsert: insertDefaults,
        },
        { upsert: true, returnDocument: "after", lean: true },
      )
      .exec();
    if (!settings) {
      throw new InternalServerErrorException("Не удалось сохранить настройки");
    }
    return {
      startDate: settings.startDate,
      dailyMinutes: settings.dailyMinutes,
      coreWeeks: settings.coreWeeks,
      bufferWeeks: settings.bufferWeeks,
      reminderEnabled: settings.reminderEnabled ?? false,
      reminderTime: settings.reminderTime ?? "19:00",
      adaptiveTodayEnabled: settings.adaptiveTodayEnabled ?? true,
    };
  }

  async updateTask(taskId: string, dto: UpdateTaskDto) {
    if (
      !TASK_IDS.has(taskId) &&
      !SPRINT_TASK_IDS.has(taskId)
    ) {
      throw new NotFoundException("Задание не найдено");
    }

    const task = await this.taskModel
      .findOneAndUpdate(
        { taskId },
        { $set: buildTaskProgressUpdate(dto) },
        { upsert: true, returnDocument: "after", lean: true, setDefaultsOnInsert: true },
      )
      .exec();
    if (!task) {
      throw new InternalServerErrorException("Не удалось сохранить задание");
    }
    return {
      taskId: task.taskId,
      completed: task.completed,
      note: task.note ?? "",
      customTask: task.customTask ?? "",
      solution: task.solution ?? "",
    };
  }

  async updateQuestion(questionId: string, dto: UpdateQuestionDto) {
    if (!QUESTION_IDS.has(questionId)) {
      throw new NotFoundException("Вопрос не найден");
    }

    const current = await this.questionModel.findOne({ questionId }).lean().exec();
    const schedulingUpdate: Partial<QuestionProgress> = {};
    if (current?.status !== dto.status) {
      if (dto.status === "new") {
        Object.assign(schedulingUpdate, {
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          nextReviewAt: null,
          lastReviewedAt: null,
          reviewCount: 0,
          lapseCount: 0,
          lastRating: null,
        });
      } else if (dto.status === "mastered") {
        const nextReviewAt = new Date();
        nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + 30);
        Object.assign(schedulingUpdate, { intervalDays: 30, nextReviewAt });
      } else {
        Object.assign(schedulingUpdate, { nextReviewAt: new Date() });
      }
    }

    const question = await this.questionModel
      .findOneAndUpdate(
        { questionId },
        { $set: { status: dto.status, note: dto.note ?? "", ...schedulingUpdate } },
        { upsert: true, returnDocument: "after", lean: true, setDefaultsOnInsert: true },
      )
      .exec();
    if (!question) {
      throw new InternalServerErrorException("Не удалось сохранить вопрос");
    }
    return {
      questionId: question.questionId,
      ...serializeQuestionProgress(question),
    };
  }

  async reviewQuestion(questionId: string, dto: ReviewQuestionDto) {
    if (!QUESTION_IDS.has(questionId)) {
      throw new NotFoundException("Вопрос не найден");
    }
    if (dto.operationId) {
      await this.questionModel
        .updateOne(
          { questionId },
          { $setOnInsert: { questionId } },
          { upsert: true, setDefaultsOnInsert: true },
        )
        .exec();
    }
    const current = await this.questionModel.findOne({ questionId }).lean().exec();
    if (dto.operationId && current?.lastReviewOperationId === dto.operationId) {
      this.logger.debug({
        event: "review_deduplicated",
        operationId: dto.operationId,
        questionId,
      });
      await this.recordReviewSignal(questionId, dto);
      return {
        questionId: current.questionId,
        ...serializeQuestionProgress(current),
      };
    }
    const schedule = scheduleQuestionReview(current ?? {}, dto.rating);
    const question = await this.questionModel
      .findOneAndUpdate(
        {
          questionId,
          ...(dto.operationId
            ? { lastReviewOperationId: { $ne: dto.operationId } }
            : {}),
        },
        {
          $set: {
            ...schedule,
            note: dto.note ?? current?.note ?? "",
            lastReviewOperationId:
              dto.operationId ?? current?.lastReviewOperationId ?? null,
          },
        },
        {
          upsert: !dto.operationId,
          returnDocument: "after",
          lean: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();
    if (!question && dto.operationId) {
      const duplicate = await this.questionModel
        .findOne({ questionId, lastReviewOperationId: dto.operationId })
        .lean()
        .exec();
      if (duplicate) {
        this.logger.debug({
          event: "review_deduplicated",
          operationId: dto.operationId,
          questionId,
        });
        await this.recordReviewSignal(questionId, dto);
        return {
          questionId: duplicate.questionId,
          ...serializeQuestionProgress(duplicate),
        };
      }
    }
    if (!question) {
      throw new InternalServerErrorException("Не удалось сохранить повторение");
    }
    await this.recordReviewSignal(questionId, dto);
    return {
      questionId: question.questionId,
      ...serializeQuestionProgress(question),
    };
  }

  async submitQuestionAttempt(questionId: string, dto: SubmitQuestionAttemptDto) {
    const question = QUESTION_BANK.find((item) => item.id === questionId);
    const training = getQuestionTraining(questionId);
    if (!question || !training) {
      throw new NotFoundException("Проверяемое задание пока не подготовлено");
    }

    const requestHash = createHash("sha256")
      .update(JSON.stringify({
        questionId,
        answer: dto.answer,
        explanation: dto.explanation ?? "",
        selectedOptionIndex: dto.selectedOptionIndex ?? null,
        confidence: dto.confidence,
        responseTimeMs: dto.responseTimeMs,
      }))
      .digest("base64url");
    const previousAttempt = await this.questionAttemptModel
      .findOne({ operationId: dto.operationId })
      .lean()
      .exec();
    if (previousAttempt) {
      const sameLegacyPayload =
        previousAttempt.questionId === questionId &&
        previousAttempt.answer === dto.answer &&
        previousAttempt.explanation === (dto.explanation ?? "") &&
        previousAttempt.confidence === dto.confidence &&
        previousAttempt.responseTimeMs === dto.responseTimeMs;
      if (
        previousAttempt.questionId !== questionId ||
        (previousAttempt.requestHash
          ? previousAttempt.requestHash !== requestHash
          : !sameLegacyPayload)
      ) {
        throw new ConflictException("operationId уже использован с другими данными");
      }
      const progress = await this.questionModel.findOne({ questionId }).lean().exec();
      if (!progress) throw new InternalServerErrorException("Не найден прогресс попытки");
      return questionAttemptResultSchema.parse({
        id: String(previousAttempt._id),
        questionId,
        exerciseType: previousAttempt.exerciseType,
        submittedAnswer: previousAttempt.answer,
        submittedExplanation: previousAttempt.explanation || null,
        passed: previousAttempt.passed,
        score: previousAttempt.score,
        feedback: previousAttempt.feedback,
        expectedAnswer: previousAttempt.expectedAnswer,
        confidence: previousAttempt.confidence,
        calibrationGap: previousAttempt.confidence - previousAttempt.score,
        progress: serializeQuestionProgress(progress),
        createdAt: previousAttempt.createdAt.toISOString(),
      });
    }

    let passed = false;
    let score = 0;
    let expectedAnswer: string | null = null;
    let feedback: string[] = [];
    const evaluator = training.evaluator;
    if (
      training.exercise.requiresExplanation &&
      evaluator.mode !== "ai" &&
      !dto.explanation?.trim()
    ) {
      throw new BadRequestException("Добавь объяснение ответа");
    }

    if (evaluator.mode === "exact") {
      passed = normalizeExpectedAnswer(dto.answer) === normalizeExpectedAnswer(evaluator.expected);
      score = passed ? 100 : 0;
      expectedAnswer = evaluator.expected;
      feedback = [evaluator.explanation];
    } else if (evaluator.mode === "choice") {
      passed = dto.selectedOptionIndex === evaluator.correctIndex;
      score = passed ? 100 : 0;
      expectedAnswer = training.exercise.choices?.[evaluator.correctIndex] ?? null;
      feedback = [evaluator.explanation];
    } else if (evaluator.mode === "runner") {
      const result = await runPracticeSolution(evaluator.runner, dto.answer);
      passed = result.passed;
      score = result.totalCount
        ? Math.round((result.passedCount / result.totalCount) * 100)
        : 0;
      feedback = [
        ...result.tests
          .filter((test) => !test.passed)
          .map((test) => test.error ? `${test.title}: ${test.error}` : `Не пройдено: ${test.title}`),
        ...(result.error ? [result.error] : []),
        evaluator.explanation,
      ];
    } else {
      const assessment = await this.agents.assessInterviewAnswer({
        company: "Frontend Sprint",
        question: {
          ...question,
          prompt: `${training.exercise.instructions}\nКритерии ответа: ${evaluator.referencePoints.join("; ")}`,
        },
        answer: dto.answer,
        followUps: [],
        followUpCount: 2,
        candidateQuestions: [],
      });
      score = assessment.score;
      passed = score >= 70 && assessment.confidence !== "low";
      feedback = [...assessment.gaps, ...assessment.strengths.map((item) => `Сильная сторона: ${item}`)];
    }

    const rating = automaticRating(
      passed,
      score,
      dto.confidence,
      dto.responseTimeMs,
      training.exercise.expectedSeconds,
    );
    const verifiedCapabilities = evaluator.mode === "ai"
      ? training.capabilities
      : training.capabilities.filter(
          (capability) => capability !== "explain" && capability !== "defend",
        );
    const attempt = await this.questionAttemptModel
      .findOneAndUpdate(
        { operationId: dto.operationId },
        {
          $setOnInsert: {
            questionId,
            exerciseType: training.exercise.type,
            skillKeys: training.skillKeys,
            capabilities: verifiedCapabilities,
            answer: dto.answer,
            explanation: dto.explanation ?? "",
            passed,
            score,
            feedback,
            expectedAnswer,
            confidence: dto.confidence,
            responseTimeMs: dto.responseTimeMs,
            automaticRating: rating,
            operationId: dto.operationId,
            requestHash,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      )
      .exec();
    if (!attempt) throw new InternalServerErrorException("Не удалось сохранить попытку");
    if (attempt.questionId !== questionId || attempt.requestHash !== requestHash) {
      throw new ConflictException("operationId уже использован с другими данными");
    }

    await this.questionModel
      .updateOne(
        { questionId },
        { $setOnInsert: { questionId } },
        { upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
    const current = await this.questionModel.findOne({ questionId }).lean().exec();
    const schedule = scheduleQuestionReview(current ?? {}, rating);
    const progress = await this.questionModel
      .findOneAndUpdate(
        { questionId, lastReviewOperationId: { $ne: dto.operationId } },
        {
          $set: {
            ...schedule,
            note: dto.explanation ?? current?.note ?? "",
            lastReviewOperationId: dto.operationId,
          },
        },
        { returnDocument: "after", lean: true },
      )
      .exec() ?? await this.questionModel.findOne({ questionId }).lean().exec();
    if (!progress) throw new InternalServerErrorException("Не удалось обновить прогресс");

    const questionSignalOperationId = `question-attempt:${dto.operationId}`;
    await this.signals.record({
      type: "question_attempted",
      itemId: questionId,
      skillKeys: training.skillKeys,
      payload: {
        exerciseType: training.exercise.type,
        capabilities: verifiedCapabilities,
        passed,
        score,
        confidence: dto.confidence,
        calibrationGap: dto.confidence - score,
        responseTimeMs: dto.responseTimeMs,
        reliability: evaluator.mode === "ai" ? 0.6 : 1,
        itemFamilyId: `question:${questionId}`,
        transferLevel: training.exercise.type === "live_coding" || training.exercise.type === "bug_fix"
          ? "near_transfer"
          : "familiar",
      },
      operationId: questionSignalOperationId,
      occurredAt: attempt.createdAt,
      nativeAssessment: {
        source: {
          kind: "question_attempt",
          itemId: questionId,
          itemVersion: "question-training-v2",
          itemFamilyId: `question:${questionId}`,
          track: null,
        },
        observations: buildAssessmentObservations(
          resolveSkillIds(training.skillKeys, questionId, {
            prompt: question.prompt,
            category: question.category,
          }),
          verifiedCapabilities.map((capability) => ({
            criterionId: `question:${questionId}:${capability}`,
            rubricVersion: evaluator.mode === "ai" ? "question-ai-v2" : "question-deterministic-v2",
            capability: capability as SkillCapability,
            score,
            reliability: evaluator.mode === "ai" ? 0.6 : 1,
          })),
        ),
        transferLevel: training.exercise.type === "live_coding" || training.exercise.type === "bug_fix"
          ? "near_transfer"
          : "familiar",
        assistance: { mode: "no_ai", hintCount: 0, solutionViewed: false },
        evaluator: {
          type: evaluator.mode === "ai" ? "ai" : "deterministic",
          evaluatorVersion: evaluator.mode === "ai" ? "question-ai-v2" : "question-deterministic-v2",
          model: null,
          promptVersion: evaluator.mode === "ai" ? "question-assessment-v1" : null,
          schemaVersion: "2",
        },
      },
    });

    return questionAttemptResultSchema.parse({
      id: String(attempt._id),
      questionId,
      exerciseType: training.exercise.type,
      submittedAnswer: attempt.answer,
      submittedExplanation: attempt.explanation || null,
      passed,
      score,
      feedback,
      expectedAnswer,
      confidence: dto.confidence,
      calibrationGap: dto.confidence - score,
      progress: serializeQuestionProgress(progress),
      createdAt: attempt.createdAt.toISOString(),
    });
  }

  async submitTrackQuiz(
    trackKey: TrackKey,
    itemId: string,
    dto: SubmitLessonQuizDto,
  ) {
    const scope = await this.resolveTrackItemScope(trackKey, itemId);
    const progress = await this.submitLessonQuiz(
      scope.courseKey,
      scope.courseVersion,
      itemId,
      dto,
    );
    const latest = progress.attempts.at(-1);
    if (latest) {
      const quizSignalOperationId = `quiz:${dto.operationId ?? randomUUID()}`;
      const nativeQuizObservations = latest.answers.flatMap((answer) => {
        const capability = normalizeSkillCapability(answer.capability) ?? "recall";
        const skillKeys = inferSkillKeys(answer.topic);
        return buildAssessmentObservations(
          resolveSkillIds(skillKeys, `${itemId}:${answer.questionId}`, { topic: answer.topic }),
          [{
            criterionId: `quiz:${answer.questionId}`,
            rubricVersion: "lesson-quiz-v2",
            capability,
            score: answer.correct ? 100 : 0,
            reliability: 1,
          }],
        );
      });
      await this.signals.record({
        type: "quiz_submitted",
        track: trackKey,
        itemId: `${itemId}:${latest.tier}`,
        skillKeys: inferSkillKeys(...latest.answers.map((answer) => answer.topic)),
        payload: {
          score: latest.score,
          maxScore: latest.answers.length,
          capabilities: [...new Set(latest.answers.flatMap((answer) =>
            answer.capability ? [answer.capability] : []))],
          transferLevel: latest.answers.some((answer) => answer.capability === "transfer")
            ? "near_transfer"
            : "familiar",
          itemFamilyId: `quiz:${itemId}`,
          itemVersion: String(progress.lessonVersion),
        },
        operationId: quizSignalOperationId,
        occurredAt: new Date(latest.completedAt),
        nativeAssessment: {
          source: {
            kind: "quiz_attempt",
            itemId: `${itemId}:${latest.tier}`,
            itemVersion: String(progress.lessonVersion),
            itemFamilyId: `quiz:${itemId}`,
            track: trackKey,
          },
          observations: nativeQuizObservations,
          transferLevel: latest.answers.some((answer) => answer.capability === "transfer")
            ? "near_transfer"
            : "familiar",
          assistance: { mode: "no_ai", hintCount: 0, solutionViewed: false },
          evaluator: {
            type: "deterministic",
            evaluatorVersion: "lesson-quiz-v2",
            model: null,
            promptVersion: null,
            schemaVersion: "2",
          },
        },
      });
    }
    return progress;
  }

  async saveTrackPracticeSolution(
    trackKey: TrackKey,
    itemId: string,
    dto: UpdatePracticeSolutionDto,
  ) {
    const scope = await this.resolveTrackItemScope(trackKey, itemId, {
      requirePractice: true,
    });
    return this.savePracticeSolution(scope.courseKey, scope.courseVersion, itemId, dto);
  }

  async listTrackPracticeAttempts(
    trackKey: TrackKey,
    itemId: string,
    dto: ListPracticeAttemptsDto,
  ) {
    const scope = await this.resolvePracticeAttemptScope(
      trackKey,
      itemId,
      dto.source,
    );
    const attempts = await this.practiceAttemptModel
      .find({
        track: trackKey,
        itemId,
        source: dto.source,
        exerciseVersion: scope.exerciseVersion,
      })
      .sort({ createdAt: -1 })
      .limit(dto.limit)
      .lean()
      .exec();
    return { attempts: attempts.map(serializePracticeAttempt) };
  }

  async submitTrackPracticeAttempt(
    trackKey: TrackKey,
    itemId: string,
    dto: SubmitPracticeAttemptDto,
  ) {
    const duplicate = await this.practiceAttemptModel
      .findOne({ operationId: dto.operationId })
      .lean()
      .exec();
    if (duplicate) {
      if (
        duplicate.track !== trackKey ||
        duplicate.itemId !== itemId ||
        duplicate.source !== dto.source ||
        duplicate.solution !== dto.solution
      ) {
        throw new BadRequestException(
          "operationId уже использован для другой попытки",
        );
      }
      await this.recordPracticeAttemptSignal(duplicate);
      return serializePracticeAttempt(duplicate);
    }

    const scope = await this.resolvePracticeAttemptScope(
      trackKey,
      itemId,
      dto.source,
      dto.lessonVersion,
    );
    const attemptNumber = await this.practiceAttemptModel.countDocuments({
      track: trackKey,
      itemId,
      source: dto.source,
      exerciseVersion: scope.exerciseVersion,
    }).exec() + 1;
    const execution = await runPracticeSolution(scope.runner, dto.solution);
    try {
      const created = await this.practiceAttemptModel.create({
        track: trackKey,
        courseKey: scope.courseKey,
        courseVersion: scope.courseVersion,
        itemId,
        source: dto.source,
        exerciseVersion: scope.exerciseVersion,
        skillKeys: scope.skillKeys,
        solution: dto.solution,
        passed: execution.passed,
        passedCount: execution.passedCount,
        totalCount: execution.totalCount,
        durationMs: execution.durationMs,
        responseTimeMs: dto.responseTimeMs,
        runCount: dto.runCount,
        hintCount: dto.hintCount,
        aiAssisted: dto.aiAssisted,
        confidence: dto.confidence,
        attemptNumber,
        firstAttemptPassed: attemptNumber === 1 && execution.passed,
        error: execution.error,
        tests: execution.tests,
        operationId: dto.operationId,
      });
      const attempt = created.toObject();
      await this.recordPracticeAttemptSignal(attempt);
      return serializePracticeAttempt(attempt);
    } catch (error) {
      const concurrent = await this.practiceAttemptModel
        .findOne({ operationId: dto.operationId })
        .lean()
        .exec();
      if (
        concurrent &&
        concurrent.track === trackKey &&
        concurrent.itemId === itemId &&
        concurrent.source === dto.source &&
        concurrent.solution === dto.solution
      ) {
        await this.recordPracticeAttemptSignal(concurrent);
        return serializePracticeAttempt(concurrent);
      }
      throw error;
    }
  }

  private async resolvePracticeAttemptScope(
    trackKey: TrackKey,
    itemId: string,
    source: "task" | "lesson",
    lessonVersion?: number,
  ) {
    if (source === "task") {
      if (!isStaticTrackKey(trackKey)) {
        throw new BadRequestException(
          "У персонального AI-курса нет статической практики",
        );
      }
      const { track, block } = getStaticTrackItem(trackKey, itemId);
      const runner = block.exercise?.runner;
      if (!runner) {
        throw new BadRequestException("Для этого блока нет запускаемой практики");
      }
      const runnerHash = createHash("sha256")
        .update(JSON.stringify(runner))
        .digest("base64url")
        .slice(0, 12);
      return {
        courseKey: track.courseKey,
        courseVersion: track.courseVersion,
        exerciseVersion: `task:${track.courseVersion}:${runnerHash}`,
        skillKeys: inferSkillKeys(
          block.title,
          block.description,
          block.exercise?.statement,
        ),
        runner,
      };
    }

    const scope = await this.resolveTrackItemScope(trackKey, itemId, {
      requirePractice: true,
    });
    const lesson = await this.aiLessonModel
      .findOne({ ...scope, itemId })
      .lean()
      .exec();
    if (!lesson) throw new NotFoundException("AI-урок не найден");
    if (lessonVersion !== undefined && lesson.version !== lessonVersion) {
      throw new BadRequestException(
        "Урок обновился. Открой его заново перед проверкой решения",
      );
    }
    if (!lesson.practice.runner) {
      throw new BadRequestException("Для этого урока нет запускаемой практики");
    }
    return {
      ...scope,
      exerciseVersion: `lesson:${lesson.version}`,
      skillKeys: inferSkillKeys(
        lesson.title,
        lesson.practice.title,
        lesson.practice.statement,
      ),
      runner: lesson.practice.runner,
    };
  }

  private async recordPracticeAttemptSignal(attempt: PracticeAttempt) {
    const operationId = `practice:${attempt.operationId}`;
    const score = attempt.totalCount
      ? Math.round((attempt.passedCount / attempt.totalCount) * 100)
      : 0;
    await this.signals.record({
      type: "practice_attempted",
      track: attempt.track,
      itemId: attempt.itemId,
      skillKeys: attempt.skillKeys ?? [],
      payload: {
        source: attempt.source,
        passed: attempt.passed,
        passedCount: attempt.passedCount,
        totalCount: attempt.totalCount,
        durationMs: attempt.durationMs,
        responseTimeMs: attempt.responseTimeMs,
        runCount: attempt.runCount,
        hintCount: attempt.hintCount,
        aiAssisted: attempt.aiAssisted,
        confidence: attempt.confidence,
        attemptNumber: attempt.attemptNumber,
        firstAttemptPassed: attempt.firstAttemptPassed,
        itemVersion: attempt.exerciseVersion,
        itemFamilyId: `practice:${attempt.itemId}`,
        transferLevel: attempt.source === "task" ? "near_transfer" : "familiar",
      },
      operationId,
      occurredAt: attempt.createdAt,
      nativeAssessment: {
        source: {
          kind: "practice_attempt",
          itemId: attempt.itemId,
          itemVersion: attempt.exerciseVersion,
          itemFamilyId: `practice:${attempt.itemId}`,
          track: attempt.track,
        },
        observations: buildAssessmentObservations(
          resolveSkillIds(attempt.skillKeys ?? [], attempt.itemId, {
            source: attempt.source,
          }),
          [{
            criterionId: "runner-tests",
            rubricVersion: "quickjs-runner-v2",
            capability: "code",
            score,
            reliability: 1,
          }],
        ),
        transferLevel: attempt.source === "task" ? "near_transfer" : "familiar",
        assistance: {
          mode: attempt.aiAssisted === true
            ? "ai_assisted"
            : attempt.aiAssisted === false
              ? "no_ai"
              : "unknown",
          hintCount: attempt.hintCount ?? 0,
          solutionViewed: false,
        },
        evaluator: {
          type: "deterministic",
          evaluatorVersion: "quickjs-runner-v2",
          model: null,
          promptVersion: null,
          schemaVersion: "2",
        },
      },
    });
  }

  private async recordReviewSignal(questionId: string, dto: ReviewQuestionDto) {
    const question = QUESTION_BANK.find((item) => item.id === questionId);
    await this.signals.record({
      type: "question_reviewed",
      itemId: questionId,
      skillKeys: inferSkillKeys(question?.category, question?.prompt),
      payload: {
        rating: dto.rating,
        itemFamilyId: `question:${questionId}`,
        transferLevel: "familiar",
      },
      operationId: `review:${dto.operationId ?? randomUUID()}`,
    });
  }

  /**
   * Проверяет, что тема существует в треке, и возвращает её координаты в базе.
   * Для персонального курса они берутся из документа, для статических треков —
   * из реестра.
   */
  private async resolveTrackItemScope(
    trackKey: TrackKey,
    itemId: string,
    options: { requirePractice?: boolean } = {},
  ) {
    if (isStaticTrackKey(trackKey)) {
      const { track, block } = getStaticTrackItem(trackKey, itemId);
      if (options.requirePractice && block.kind === "review") {
        throw new BadRequestException("Для блока разбора нет практического решения");
      }
      return { courseKey: track.courseKey, courseVersion: track.courseVersion };
    }
    const { course } = await this.getCourseItem(itemId);
    return { courseKey: course.key, courseVersion: course.version };
  }

  private async savePracticeSolution(
    courseKey: string,
    courseVersion: number,
    itemId: string,
    dto: UpdatePracticeSolutionDto,
  ) {
    const lesson = await this.aiLessonModel
      .findOne({ courseKey, courseVersion, itemId })
      .lean()
      .exec();
    if (!lesson) throw new NotFoundException("AI-урок не найден");
    if (lesson.version !== dto.lessonVersion) {
      throw new BadRequestException("Урок обновился. Открой его заново перед сохранением");
    }
    const progressFilter = {
      courseKey,
      courseVersion,
      itemId,
      lessonVersion: lesson.version,
    };
    const current = await this.aiPracticeProgressModel
      .findOne(progressFilter)
      .lean()
      .exec();
    if (
      current?.lastOperationId === dto.operationId ||
      (current && current.solution === dto.solution)
    ) {
      return { saved: true, progress: serializePracticeProgress(current) };
    }
    if (current && current.revision !== dto.baseRevision) {
      return { saved: false, progress: serializePracticeProgress(current) };
    }
    if (!current && dto.baseRevision !== 0) {
      return { saved: false, progress: null };
    }

    if (!current) {
      try {
        const created = await this.aiPracticeProgressModel.create({
          ...progressFilter,
          solution: dto.solution,
          revision: 1,
          lastOperationId: dto.operationId,
        });
        return {
          saved: true,
          progress: serializePracticeProgress(created.toObject()),
        };
      } catch (error) {
        const conflict = await this.aiPracticeProgressModel
          .findOne(progressFilter)
          .lean()
          .exec();
        if (conflict) {
          return { saved: false, progress: serializePracticeProgress(conflict) };
        }
        throw error;
      }
    }

    const updated = await this.aiPracticeProgressModel
      .findOneAndUpdate(
        { ...progressFilter, revision: dto.baseRevision },
        {
          $set: {
            solution: dto.solution,
            lastOperationId: dto.operationId,
          },
          $inc: { revision: 1 },
        },
        { returnDocument: "after", lean: true },
      )
      .exec();
    if (updated) {
      return { saved: true, progress: serializePracticeProgress(updated) };
    }
    const conflict = await this.aiPracticeProgressModel
      .findOne(progressFilter)
      .lean()
      .exec();
    return {
      saved: false,
      progress: conflict ? serializePracticeProgress(conflict) : null,
    };
  }

  private async submitLessonQuiz(
    courseKey: string,
    courseVersion: number,
    itemId: string,
    dto: SubmitLessonQuizDto,
  ) {
    const lesson = await this.aiLessonModel
      .findOne({ courseKey, courseVersion, itemId })
      .lean()
      .exec();
    if (!lesson) throw new NotFoundException("AI-урок не найден");
    const quiz = lesson.quiz ?? [];
    const quizVersion = quiz.length === 20 ? 2 : quiz.length === 10 ? 1 : 0;
    if (quizVersion === 0) {
      throw new BadRequestException("Обнови статью, чтобы получить проверочный тест");
    }
    if (quizVersion === 2 && !dto.tier) {
      throw new BadRequestException("Выбери уровень теста: core или deep");
    }
    const tier = quizVersion === 1 ? "legacy" : dto.tier!;
    const selectedQuestions = quizVersion === 1
      ? quiz
      : quiz.filter((question, index) =>
          (question.tier ?? (index < 10 ? "core" : "deep")) === tier,
        );
    if (selectedQuestions.length !== 10) {
      throw new BadRequestException("Тест имеет некорректное распределение Core и Deep");
    }
    const submitted = new Map(
      dto.answers.map((answer) => [answer.questionId, answer.selectedOptionIndex]),
    );
    if (submitted.size !== selectedQuestions.length) {
      throw new BadRequestException("Нужно ответить на все вопросы теста");
    }
    const answers = selectedQuestions.map((question) => {
      const selectedOptionIndex = submitted.get(question.id);
      if (selectedOptionIndex === undefined) {
        throw new BadRequestException("Ответы не соответствуют текущей версии теста");
      }
      return {
        questionId: question.id,
        selectedOptionIndex,
        correct: selectedOptionIndex === question.correctOptionIndex,
        correctOptionIndex: question.correctOptionIndex,
        explanation: question.explanation,
        topic: question.topic,
        capability: question.capability,
      };
    });
    const requestHash = createHash("sha256")
      .update(JSON.stringify({
        tier,
        answers: [...answers]
          .map(({ questionId, selectedOptionIndex }) => ({ questionId, selectedOptionIndex }))
          .sort((left, right) => left.questionId.localeCompare(right.questionId)),
      }))
      .digest("base64url");
    const assertMatchingAttempt = (
      existingAttempt: AiQuizProgress["attempts"][number],
    ) => {
      if (existingAttempt.requestHash) {
        if (existingAttempt.requestHash !== requestHash) {
          throw new ConflictException("operationId уже использован с другими ответами");
        }
        return;
      }
      const previousAnswers = [...existingAttempt.answers]
        .map(({ questionId, selectedOptionIndex }) => ({ questionId, selectedOptionIndex }))
        .sort((left, right) => left.questionId.localeCompare(right.questionId));
      if (
        (existingAttempt.tier ?? "legacy") !== tier ||
        JSON.stringify(previousAnswers) !== JSON.stringify(
          [...answers]
            .map(({ questionId, selectedOptionIndex }) => ({ questionId, selectedOptionIndex }))
            .sort((left, right) => left.questionId.localeCompare(right.questionId)),
        )
      ) {
        throw new ConflictException("operationId уже использован с другими ответами");
      }
    };
    const attempt = {
      operationId: dto.operationId ?? null,
      requestHash,
      score: answers.filter((answer) => answer.correct).length,
      tier,
      answers,
      completedAt: new Date(),
    };
    const progressFilter = { courseKey, courseVersion, itemId, lessonVersion: lesson.version };
    if (dto.operationId) {
      const existing = await this.aiQuizProgressModel
        .findOneAndUpdate(
          progressFilter,
          { $setOnInsert: progressFilter },
          { upsert: true, returnDocument: "after", lean: true, setDefaultsOnInsert: true },
        )
        .lean()
        .exec();
      const existingAttempt = existing?.attempts.find(
        (item) => item.operationId === dto.operationId,
      );
      if (existing && existingAttempt) {
        assertMatchingAttempt(existingAttempt);
        this.logger.debug({
          event: "quiz_deduplicated",
          operationId: dto.operationId,
          courseKey,
          itemId,
        });
        return serializeQuizProgress(existing);
      }
      const progress = await this.aiQuizProgressModel
        .findOneAndUpdate(
          { ...progressFilter, "attempts.operationId": { $ne: dto.operationId } },
          { $push: { attempts: attempt } },
          { returnDocument: "after", lean: true },
        )
        .exec();
      if (progress) return serializeQuizProgress(progress);
      const duplicate = await this.aiQuizProgressModel.findOne(progressFilter).lean().exec();
      if (duplicate) {
        const duplicateAttempt = duplicate.attempts.find(
          (item) => item.operationId === dto.operationId,
        );
        if (duplicateAttempt) assertMatchingAttempt(duplicateAttempt);
        this.logger.debug({
          event: "quiz_deduplicated",
          operationId: dto.operationId,
          courseKey,
          itemId,
        });
        return serializeQuizProgress(duplicate);
      }
      throw new InternalServerErrorException("Не удалось сохранить тест");
    }
    const progress = await this.aiQuizProgressModel
      .findOneAndUpdate(
        progressFilter,
        {
          $setOnInsert: { courseKey, courseVersion, itemId, lessonVersion: lesson.version },
          $push: { attempts: attempt },
        },
        { upsert: true, returnDocument: "after", lean: true, setDefaultsOnInsert: true },
      )
      .exec();
    if (!progress) throw new InternalServerErrorException("Не удалось сохранить тест");
    return serializeQuizProgress(progress);
  }

  async getCurrentMockInterview() {
    const interview = await this.mockInterviewModel
      .findOne({ status: "in_progress" })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return interview ? serializeMockInterview(interview) : null;
  }

  async startMockInterview() {
    const current = await this.getCurrentMockInterview();
    if (current) return current;
    const progressDocuments = await this.questionModel.find().lean().exec();
    const progress = new Map(
      progressDocuments.map((question) => [question.questionId, question]),
    );
    const selected = selectMockInterviewQuestions(QUESTION_BANK, progress, 5);
    const interview = await this.mockInterviewModel.create({
      status: "in_progress",
      questionIds: selected.map((question) => question.id),
      answers: [],
      durationMinutes: 20,
      startedAt: new Date(),
      completedAt: null,
      evaluation: null,
    });
    return serializeMockInterview(interview);
  }

  async updateMockAnswer(
    interviewId: string,
    questionId: string,
    dto: UpdateMockAnswerDto,
  ) {
    const interview = await this.getMockInterviewDocument(interviewId);
    if (interview.status !== "in_progress") {
      throw new BadRequestException("Интервью уже завершено");
    }
    if (!interview.questionIds.includes(questionId)) {
      throw new NotFoundException("Вопрос не входит в это интервью");
    }
    const content = dto.content.trim();
    const answer = interview.answers.find((item) => item.questionId === questionId);
    if (answer) answer.content = content;
    else interview.answers.push({ questionId, content });
    await interview.save();
    return serializeMockInterview(interview);
  }

  async completeMockInterview(interviewId: string) {
    const interview = await this.getMockInterviewDocument(interviewId);
    if (interview.status === "completed") {
      await this.recordMockSignal(interview);
      return serializeMockInterview(interview);
    }
    const questionMap = new Map(QUESTION_BANK.map((question) => [question.id, question]));
    const answerMap = new Map(
      interview.answers.map((answer) => [answer.questionId, answer.content.trim()]),
    );
    const entries = interview.questionIds.map((questionId) => ({
      question: questionMap.get(questionId),
      answer: answerMap.get(questionId) ?? "",
    }));
    if (entries.some(({ question, answer }) => !question || !answer)) {
      throw new BadRequestException("Ответь на все вопросы перед завершением интервью");
    }
    const evaluation = await this.aiContent.evaluateMockInterview(
      entries.map(({ question, answer }) => ({ question: question!, answer })),
    );
    interview.status = "completed";
    interview.completedAt = new Date();
    interview.evaluation = evaluation;
    await interview.save();
    await this.recordMockSignal(interview);
    return serializeMockInterview(interview);
  }

  private async recordMockSignal(interview: MockInterview & { _id: unknown }) {
    if (!interview.evaluation) return;
    const questionMap = new Map(QUESTION_BANK.map((question) => [question.id, question]));
    const nativeObservations = interview.evaluation.questions.flatMap((evaluation) => {
      const question = questionMap.get(evaluation.questionId);
      if (!question) return [];
      return buildAssessmentObservations(
        resolveSkillIds(
          inferSkillKeys(question.category, question.prompt),
          question.id,
          { category: question.category, prompt: question.prompt },
        ),
        [{
          criterionId: `mock:${question.id}:explain`,
          rubricVersion: "mock-interview-ai-v2",
          capability: "explain",
          score: evaluation.score * 20,
          reliability: 0.6,
        }],
      );
    });
    await this.signals.record({
      type: "mock_completed",
      skillKeys: inferSkillKeys(...interview.evaluation.weakTopics),
      payload: {
        score: interview.evaluation.overallScore,
        itemFamilyId: `mock:${String(interview._id)}`,
        transferLevel: "near_transfer",
      },
      operationId: `mock:${String(interview._id)}`,
      occurredAt: interview.completedAt ?? new Date(),
      nativeAssessment: {
        source: {
          kind: "mock_interview",
          itemId: String(interview._id),
          itemVersion: "mock-interview-v2",
          itemFamilyId: `mock:${String(interview._id)}`,
          track: null,
        },
        observations: nativeObservations,
        transferLevel: "near_transfer",
        assistance: { mode: "no_ai", hintCount: 0, solutionViewed: false },
        evaluator: {
          type: "ai",
          evaluatorVersion: "mock-interview-ai-v2",
          model: null,
          promptVersion: "mock-interview-evaluation-v1",
          schemaVersion: "2",
        },
      },
    });
  }

  async transcribeMockAnswer(
    interviewId: string,
    audio: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const interview = await this.getMockInterviewDocument(interviewId);
    if (interview.status !== "in_progress") {
      throw new BadRequestException("Интервью уже завершено");
    }
    const text = await this.aiContent.transcribeAudio(
      audio.buffer,
      audio.originalname || "mock-answer.webm",
      audio.mimetype || "audio/webm",
    );
    return { text };
  }

  private async getMockInterviewDocument(interviewId: string) {
    if (!isValidObjectId(interviewId)) throw new NotFoundException("Интервью не найдено");
    const interview = await this.mockInterviewModel.findById(interviewId).exec();
    if (!interview) throw new NotFoundException("Интервью не найдено");
    return interview;
  }

  async addAlgorithm(dto: CreateAlgorithmDto) {
    const entry = await this.algorithmModel.create({ ...dto, note: dto.note ?? "" });
    return {
      id: String(entry._id),
      title: entry.title,
      pattern: entry.pattern,
      difficulty: entry.difficulty,
      solvedAt: entry.solvedAt,
      note: entry.note,
    };
  }

  async deleteAlgorithm(id: string) {
    const result = await this.algorithmModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException("Решение не найдено");
    }
    return { deleted: true };
  }

  /** Собирает координаты темы и текстовый контекст для AI-чата любого трека. */
  private async resolveTrackChatScope(
    trackKey: TrackKey,
    itemId: string,
  ): Promise<AiChatScope> {
    if (isStaticTrackKey(trackKey)) {
      const { track, day, block } = getStaticTrackItem(trackKey, itemId);
      const lesson = await this.aiLessonModel
        .findOne({
          courseKey: track.courseKey,
          courseVersion: track.courseVersion,
          itemId,
        })
        .lean()
        .exec();
      return {
        courseKey: track.courseKey,
        courseVersion: track.courseVersion,
        itemId,
        title: block.title,
        context: buildTrackAiChatContext(track.chatGoal, {
          day,
          block,
          lesson,
          resources: this.resolveResources(block.resourceIds),
        }),
      };
    }

    const { course, item } = await this.getCourseItem(itemId);
    const lesson = await this.aiLessonModel
      .findOne({ courseKey: course.key, courseVersion: course.version, itemId })
      .lean()
      .exec();
    return {
      courseKey: course.key,
      courseVersion: course.version,
      itemId,
      title: item.title,
      context: buildAiChatContext({
        course,
        item,
        lesson,
        resources: this.resolveResources(item.resourceIds),
      }),
    };
  }

  private serializeAiChatMessage(message: AiChatMessageRecord) {
    return {
      id: String(message._id),
      role: message.role,
      content: message.content,
      createdAt: (message.createdAt ?? new Date()).toISOString(),
    };
  }
}
