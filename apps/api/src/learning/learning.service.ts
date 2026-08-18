import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";

import { AiContentService, type AiDeltaHandler } from "./ai-content.service";
import {
  buildAiChatContext,
  buildInterviewSprintAiChatContext,
} from "./ai-chat";
import { selectResourcesForCourseItem, type GeneratedLesson } from "./ai-course";
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
  ReviewQuestionDto,
  SendAiChatMessageDto,
  SubmitLessonQuizDto,
  UpdateMockAnswerDto,
  UpdatePracticeSolutionDto,
  UpdateQuestionDto,
  UpdateSettingsDto,
  UpdateTaskDto,
} from "./dto/learning.dto";
import { selectMockInterviewQuestions } from "./mock-interview";
import {
  generateValidatedLesson,
  GeneratedRunnerValidationError,
} from "./generated-runner";
import {
  serializeAiCourse,
  serializeAiLesson,
  serializeMockInterview,
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
import { Settings } from "./schemas/settings.schema";
import { TaskProgress } from "./schemas/task-progress.schema";
import { scheduleQuestionReview } from "./spaced-repetition";
import { buildTaskProgressUpdate } from "./task-progress";
import {
  getSprintBlock,
  SPRINT_TASK_IDS,
  type SprintTrackScope,
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

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(TaskProgress.name) private readonly taskModel: Model<TaskProgress>,
    @InjectModel(QuestionProgress.name)
    private readonly questionModel: Model<QuestionProgress>,
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
    @InjectModel(MockInterview.name)
    private readonly mockInterviewModel: Model<MockInterview>,
    private readonly aiContent: AiContentService,
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
    return serializeAiCourse(course);
  }

  async generateAiLesson(
    itemId: string,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    const course = await this.aiCourseModel.findOne({ key: "main" }).lean().exec();
    if (!course) {
      throw new NotFoundException("Сначала создай AI-курс");
    }
    const item = course.items.find((courseItem) => courseItem.id === itemId);
    if (!item) {
      throw new NotFoundException("Тема AI-курса не найдена");
    }
    const resourceMap = new Map(RESOURCES.map((resource) => [resource.id, resource]));
    const resources = item.resourceIds.flatMap((resourceId) => {
      const resource = resourceMap.get(resourceId);
      return resource ? [resource] : [];
    });
    const progressHandler = this.createSafeLessonProgressHandler(onDelta);
    const generated = await this.generateRunnableLesson(
      "course",
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
    return serializeAiLesson(lesson);
  }

  async generateYandexLesson(
    blockId: string,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    return this.generateSprintLesson("yandex", blockId, onDelta, signal);
  }

  async generateOzonLesson(
    blockId: string,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    return this.generateSprintLesson("ozon", blockId, onDelta, signal);
  }

  private async generateSprintLesson(
    trackScope: SprintTrackScope,
    blockId: string,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    const { track, day, block } = getSprintBlock(trackScope, blockId);
    if (block.kind === "review") {
      throw new BadRequestException("Для блока разбора отдельный AI-урок не требуется");
    }
    const resourceMap = new Map(RESOURCES.map((resource) => [resource.id, resource]));
    const resources = block.resourceIds.flatMap((resourceId) => {
      const resource = resourceMap.get(resourceId);
      return resource ? [resource] : [];
    });
    const progressHandler = this.createSafeLessonProgressHandler(onDelta);
    const generated = await this.generateRunnableLesson(
      track.scope,
      () => this.aiContent.generateSprintLesson(
        track.company,
        day,
        block,
        resources,
        progressHandler,
        signal,
      ),
    );
    const scope = {
      courseKey: track.courseKey,
      courseVersion: track.courseVersion,
      itemId: blockId,
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
    return serializeAiLesson(lesson);
  }

  private async generateRunnableLesson(
    scope: string,
    generate: (attempt: number) => Promise<GeneratedLesson>,
  ) {
    try {
      return await generateValidatedLesson(generate, (validation, attempt) => {
        this.logger.warn({
          event: "generated_runner_validation_failed",
          scope,
          attempt,
          failureCount: validation.failures.length,
        });
      });
    } catch (error) {
      if (!(error instanceof GeneratedRunnerValidationError)) throw error;
      throw new BadGatewayException(
        "AI не смог создать корректно запускаемую задачу после трёх попыток.",
      );
    }
  }

  private createSafeLessonProgressHandler(onDelta?: AiDeltaHandler) {
    if (!onDelta) return undefined;
    return (delta: string) => onDelta(" ".repeat(delta.length));
  }

  async getAiChat(itemId: string) {
    return this.readAiChat(await this.getAiChatScope(itemId));
  }

  async getYandexAiChat(blockId: string) {
    return this.getSprintAiChat("yandex", blockId);
  }

  async getOzonAiChat(blockId: string) {
    return this.getSprintAiChat("ozon", blockId);
  }

  private async getSprintAiChat(trackScope: SprintTrackScope, blockId: string) {
    return this.readAiChat(await this.getSprintAiChatScope(trackScope, blockId));
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

  async sendAiChatMessage(
    itemId: string,
    dto: SendAiChatMessageDto,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    return this.replyToAiChat(await this.getAiChatScope(itemId), dto, onDelta, signal);
  }

  async sendYandexAiChatMessage(
    blockId: string,
    dto: SendAiChatMessageDto,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    return this.sendSprintAiChatMessage("yandex", blockId, dto, onDelta, signal);
  }

  async sendOzonAiChatMessage(
    blockId: string,
    dto: SendAiChatMessageDto,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    return this.sendSprintAiChatMessage("ozon", blockId, dto, onDelta, signal);
  }

  private async sendSprintAiChatMessage(
    trackScope: SprintTrackScope,
    blockId: string,
    dto: SendAiChatMessageDto,
    onDelta?: AiDeltaHandler,
    signal?: AbortSignal,
  ) {
    return this.replyToAiChat(
      await this.getSprintAiChatScope(trackScope, blockId),
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

  async clearAiChat(itemId: string) {
    return this.deleteAiChat(await this.getAiChatScope(itemId));
  }

  async clearYandexAiChat(blockId: string) {
    return this.clearSprintAiChat("yandex", blockId);
  }

  async clearOzonAiChat(blockId: string) {
    return this.clearSprintAiChat("ozon", blockId);
  }

  private async clearSprintAiChat(trackScope: SprintTrackScope, blockId: string) {
    return this.deleteAiChat(await this.getSprintAiChatScope(trackScope, blockId));
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
        return {
          questionId: duplicate.questionId,
          ...serializeQuestionProgress(duplicate),
        };
      }
    }
    if (!question) {
      throw new InternalServerErrorException("Не удалось сохранить повторение");
    }
    return {
      questionId: question.questionId,
      ...serializeQuestionProgress(question),
    };
  }

  async submitAiLessonQuiz(itemId: string, dto: SubmitLessonQuizDto) {
    const course = await this.aiCourseModel.findOne({ key: "main" }).lean().exec();
    if (!course) throw new NotFoundException("Сначала создай AI-курс");
    return this.submitLessonQuiz(course.key, course.version, itemId, dto);
  }

  async submitYandexLessonQuiz(blockId: string, dto: SubmitLessonQuizDto) {
    return this.submitSprintLessonQuiz("yandex", blockId, dto);
  }

  async submitOzonLessonQuiz(blockId: string, dto: SubmitLessonQuizDto) {
    return this.submitSprintLessonQuiz("ozon", blockId, dto);
  }

  async updateAiPracticeSolution(
    itemId: string,
    dto: UpdatePracticeSolutionDto,
  ) {
    const course = await this.aiCourseModel.findOne({ key: "main" }).lean().exec();
    if (!course) throw new NotFoundException("Сначала создай AI-курс");
    if (!course.items.some((item) => item.id === itemId)) {
      throw new NotFoundException("Тема AI-курса не найдена");
    }
    return this.savePracticeSolution(course.key, course.version, itemId, dto);
  }

  async updateYandexPracticeSolution(
    blockId: string,
    dto: UpdatePracticeSolutionDto,
  ) {
    return this.updateSprintPracticeSolution("yandex", blockId, dto);
  }

  async updateOzonPracticeSolution(
    blockId: string,
    dto: UpdatePracticeSolutionDto,
  ) {
    return this.updateSprintPracticeSolution("ozon", blockId, dto);
  }

  private async updateSprintPracticeSolution(
    trackScope: SprintTrackScope,
    blockId: string,
    dto: UpdatePracticeSolutionDto,
  ) {
    const { track, block } = getSprintBlock(trackScope, blockId);
    if (block.kind === "review") {
      throw new BadRequestException("Для блока разбора нет практического решения");
    }
    return this.savePracticeSolution(
      track.courseKey,
      track.courseVersion,
      blockId,
      dto,
    );
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

  private async submitSprintLessonQuiz(
    trackScope: SprintTrackScope,
    blockId: string,
    dto: SubmitLessonQuizDto,
  ) {
    const { track } = getSprintBlock(trackScope, blockId);
    return this.submitLessonQuiz(
      track.courseKey,
      track.courseVersion,
      blockId,
      dto,
    );
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
    if ((lesson.quiz ?? []).length !== 10) {
      throw new BadRequestException("Обнови статью, чтобы получить проверочный тест");
    }
    const submitted = new Map(
      dto.answers.map((answer) => [answer.questionId, answer.selectedOptionIndex]),
    );
    if (submitted.size !== lesson.quiz.length) {
      throw new BadRequestException("Нужно ответить на все вопросы теста");
    }
    const answers = lesson.quiz.map((question) => {
      const selectedOptionIndex = submitted.get(question.id);
      if (selectedOptionIndex === undefined) {
        throw new BadRequestException("Ответы не соответствуют текущей версии теста");
      }
      return {
        questionId: question.id,
        selectedOptionIndex,
        correct: selectedOptionIndex === question.correctOptionIndex,
        topic: question.topic,
      };
    });
    const attempt = {
      operationId: dto.operationId ?? null,
      score: answers.filter((answer) => answer.correct).length,
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
      if (existing?.attempts.some((item) => item.operationId === dto.operationId)) {
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
    if (interview.status === "completed") return serializeMockInterview(interview);
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
    return serializeMockInterview(interview);
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

  private async getAiChatScope(itemId: string) {
    const course = await this.aiCourseModel.findOne({ key: "main" }).lean().exec();
    if (!course) {
      throw new NotFoundException("Сначала создай AI-курс");
    }
    const item = course.items.find((courseItem) => courseItem.id === itemId);
    if (!item) {
      throw new NotFoundException("Тема AI-курса не найдена");
    }
    const lesson = await this.aiLessonModel
      .findOne({ courseKey: course.key, courseVersion: course.version, itemId })
      .lean()
      .exec();
    const resourceMap = new Map(RESOURCES.map((resource) => [resource.id, resource]));
    const resources = item.resourceIds.flatMap((resourceId) => {
      const resource = resourceMap.get(resourceId);
      return resource ? [resource] : [];
    });
    return {
      courseKey: course.key,
      courseVersion: course.version,
      itemId,
      title: item.title,
      context: buildAiChatContext({ course, item, lesson, resources }),
    };
  }

  private async getSprintAiChatScope(
    trackScope: SprintTrackScope,
    blockId: string,
  ): Promise<AiChatScope> {
    const { track, day, block } = getSprintBlock(trackScope, blockId);
    const lesson = await this.aiLessonModel
      .findOne({
        courseKey: track.courseKey,
        courseVersion: track.courseVersion,
        itemId: blockId,
      })
      .lean()
      .exec();
    const resourceMap = new Map(RESOURCES.map((resource) => [resource.id, resource]));
    const resources = block.resourceIds.flatMap((resourceId) => {
      const resource = resourceMap.get(resourceId);
      return resource ? [resource] : [];
    });
    return {
      courseKey: track.courseKey,
      courseVersion: track.courseVersion,
      itemId: blockId,
      title: block.title,
      context: buildInterviewSprintAiChatContext(track.company, {
        day,
        block,
        lesson,
        resources,
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
