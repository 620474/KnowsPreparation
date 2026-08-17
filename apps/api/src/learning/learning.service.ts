import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";

import { AiContentService, type AiDeltaHandler } from "./ai-content.service";
import {
  buildAiChatContext,
  buildOzonAiChatContext,
  buildYandexAiChatContext,
} from "./ai-chat";
import { selectResourcesForCourseItem } from "./ai-course";
import {
  ALGORITHM_PATTERNS,
  CURRICULUM,
  QUESTION_BANK,
  QUESTION_IDS,
  TASK_IDS,
} from "./curriculum";
import { RESOURCES } from "./resources";
import {
  OZON_SPRINT,
  OZON_SPRINT_AI_KEY,
  OZON_SPRINT_AI_VERSION,
  OZON_TASK_IDS,
} from "./ozon-sprint";
import {
  YANDEX_SPRINT,
  YANDEX_SPRINT_AI_KEY,
  YANDEX_SPRINT_AI_VERSION,
  YANDEX_TASK_IDS,
} from "./yandex-sprint";
import {
  CreateAlgorithmDto,
  GenerateAiCourseDto,
  ReviewQuestionDto,
  SendAiChatMessageDto,
  SubmitLessonQuizDto,
  UpdateMockAnswerDto,
  UpdateQuestionDto,
  UpdateSettingsDto,
  UpdateTaskDto,
} from "./dto/learning.dto";
import { selectMockInterviewQuestions } from "./mock-interview";
import { AlgorithmEntry } from "./schemas/algorithm-entry.schema";
import { AiChatMessage } from "./schemas/ai-chat-message.schema";
import { AiCourse, AiLesson } from "./schemas/ai-course.schema";
import { AiQuizProgress } from "./schemas/ai-quiz-progress.schema";
import { MockInterview } from "./schemas/mock-interview.schema";
import { QuestionProgress } from "./schemas/question-progress.schema";
import { Settings } from "./schemas/settings.schema";
import { TaskProgress } from "./schemas/task-progress.schema";
import { scheduleQuestionReview } from "./spaced-repetition";
import { buildTaskProgressUpdate } from "./task-progress";

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
    @InjectModel(MockInterview.name)
    private readonly mockInterviewModel: Model<MockInterview>,
    private readonly aiContent: AiContentService,
  ) {}

  async getBootstrap() {
    const today = new Date().toISOString().slice(0, 10);
    const settings = await this.settingsModel
      .findOneAndUpdate(
        { key: "main" },
        {
          $setOnInsert: {
            key: "main",
            startDate: today,
            dailyMinutes: 120,
            coreWeeks: 10,
            bufferWeeks: 2,
          },
        },
        { upsert: true, returnDocument: "after", lean: true },
      )
      .exec();
    const [tasks, questions, algorithms, aiCourse, mockInterviews] = await Promise.all([
      this.taskModel.find().lean().exec(),
      this.questionModel.find().lean().exec(),
      this.algorithmModel.find().sort({ solvedAt: -1, createdAt: -1 }).lean().exec(),
      this.aiCourseModel.findOne({ key: "main" }).lean().exec(),
      this.mockInterviewModel.find().sort({ updatedAt: -1 }).limit(20).lean().exec(),
    ]);
    const [aiLessons, yandexLessons, ozonLessons, quizProgresses] = await Promise.all([
      aiCourse
        ? this.aiLessonModel
            .find({ courseKey: aiCourse.key, courseVersion: aiCourse.version })
            .lean()
            .exec()
        : Promise.resolve([]),
      this.aiLessonModel
        .find({
          courseKey: YANDEX_SPRINT_AI_KEY,
          courseVersion: YANDEX_SPRINT_AI_VERSION,
        })
        .lean()
        .exec(),
      this.aiLessonModel
        .find({
          courseKey: OZON_SPRINT_AI_KEY,
          courseVersion: OZON_SPRINT_AI_VERSION,
        })
        .lean()
        .exec(),
      this.aiQuizProgressModel.find().sort({ updatedAt: -1 }).lean().exec(),
    ]);

    if (!settings) {
      throw new InternalServerErrorException("Не удалось создать настройки плана");
    }

    return {
      settings: {
        startDate: settings.startDate,
        dailyMinutes: settings.dailyMinutes,
        coreWeeks: settings.coreWeeks,
        bufferWeeks: settings.bufferWeeks,
      },
      curriculum: CURRICULUM,
      yandexSprint: YANDEX_SPRINT,
      ozonSprint: OZON_SPRINT,
      resources: RESOURCES,
      questions: QUESTION_BANK,
      algorithmPatterns: ALGORITHM_PATTERNS,
      progress: {
        tasks: Object.fromEntries(
          tasks.map((task) => [
            task.taskId,
            {
              completed: task.completed,
              note: task.note ?? "",
              customTask: task.customTask ?? "",
              solution: task.solution ?? "",
            },
          ]),
        ),
        questions: Object.fromEntries(
          questions.map((question) => [
            question.questionId,
            this.serializeQuestionProgress(question),
          ]),
        ),
      },
      mockInterviews: mockInterviews.map((interview) => this.serializeMockInterview(interview)),
      algorithms: algorithms.map((entry) => ({
        id: String(entry._id),
        title: entry.title,
        pattern: entry.pattern,
        difficulty: entry.difficulty,
        solvedAt: entry.solvedAt,
        note: entry.note ?? "",
      })),
      ai: {
        enabled: this.aiContent.enabled,
        model: this.aiContent.model,
        course: aiCourse ? this.serializeAiCourse(aiCourse) : null,
        lessons: Object.fromEntries(
          aiLessons.map((lesson) => [lesson.itemId, this.serializeAiLesson(lesson)]),
        ),
        yandexLessons: Object.fromEntries(
          yandexLessons.map((lesson) => [lesson.itemId, this.serializeAiLesson(lesson)]),
        ),
        ozonLessons: Object.fromEntries(
          ozonLessons.map((lesson) => [lesson.itemId, this.serializeAiLesson(lesson)]),
        ),
        quizProgress: this.serializeQuizProgressCollection(quizProgresses, aiCourse),
      },
    };
  }

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
    return this.serializeAiCourse(course);
  }

  async generateAiLesson(itemId: string, onDelta?: AiDeltaHandler) {
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
    const generated = await this.aiContent.generateLesson(
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
      onDelta,
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
    return this.serializeAiLesson(lesson);
  }

  async generateYandexLesson(blockId: string, onDelta?: AiDeltaHandler) {
    const { day, block } = this.getYandexBlock(blockId);
    if (block.kind === "review") {
      throw new BadRequestException("Для блока разбора отдельный AI-урок не требуется");
    }
    const resourceMap = new Map(RESOURCES.map((resource) => [resource.id, resource]));
    const resources = block.resourceIds.flatMap((resourceId) => {
      const resource = resourceMap.get(resourceId);
      return resource ? [resource] : [];
    });
    const generated = await this.aiContent.generateYandexLesson(
      day,
      block,
      resources,
      onDelta,
    );
    const scope = {
      courseKey: YANDEX_SPRINT_AI_KEY,
      courseVersion: YANDEX_SPRINT_AI_VERSION,
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
      throw new InternalServerErrorException("Не удалось сохранить разбор темы Яндекса");
    }
    return this.serializeAiLesson(lesson);
  }

  async generateOzonLesson(blockId: string, onDelta?: AiDeltaHandler) {
    const { day, block } = this.getOzonBlock(blockId);
    if (block.kind === "review") {
      throw new BadRequestException("Для блока разбора отдельный AI-урок не требуется");
    }
    const resourceMap = new Map(RESOURCES.map((resource) => [resource.id, resource]));
    const resources = block.resourceIds.flatMap((resourceId) => {
      const resource = resourceMap.get(resourceId);
      return resource ? [resource] : [];
    });
    const generated = await this.aiContent.generateOzonLesson(day, block, resources, onDelta);
    const scope = {
      courseKey: OZON_SPRINT_AI_KEY,
      courseVersion: OZON_SPRINT_AI_VERSION,
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
      throw new InternalServerErrorException("Не удалось сохранить разбор темы Ozon");
    }
    return this.serializeAiLesson(lesson);
  }

  async getAiChat(itemId: string) {
    return this.readAiChat(await this.getAiChatScope(itemId));
  }

  async getYandexAiChat(blockId: string) {
    return this.readAiChat(await this.getYandexAiChatScope(blockId));
  }

  async getOzonAiChat(blockId: string) {
    return this.readAiChat(await this.getOzonAiChatScope(blockId));
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
  ) {
    return this.replyToAiChat(await this.getAiChatScope(itemId), dto, onDelta);
  }

  async sendYandexAiChatMessage(
    blockId: string,
    dto: SendAiChatMessageDto,
    onDelta?: AiDeltaHandler,
  ) {
    return this.replyToAiChat(await this.getYandexAiChatScope(blockId), dto, onDelta);
  }

  async sendOzonAiChatMessage(
    blockId: string,
    dto: SendAiChatMessageDto,
    onDelta?: AiDeltaHandler,
  ) {
    return this.replyToAiChat(await this.getOzonAiChatScope(blockId), dto, onDelta);
  }

  private async replyToAiChat(
    scope: AiChatScope,
    dto: SendAiChatMessageDto,
    onDelta?: AiDeltaHandler,
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
    return this.deleteAiChat(await this.getYandexAiChatScope(blockId));
  }

  async clearOzonAiChat(blockId: string) {
    return this.deleteAiChat(await this.getOzonAiChatScope(blockId));
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
    const settings = await this.settingsModel
      .findOneAndUpdate(
        { key: "main" },
        {
          $set: { startDate: dto.startDate },
          $setOnInsert: { key: "main", dailyMinutes: 120, coreWeeks: 10, bufferWeeks: 2 },
        },
        { upsert: true, returnDocument: "after", lean: true },
      )
      .exec();
    if (!settings) {
      throw new InternalServerErrorException("Не удалось сохранить настройки");
    }
    return { startDate: settings.startDate };
  }

  async updateTask(taskId: string, dto: UpdateTaskDto) {
    if (
      !TASK_IDS.has(taskId) &&
      !YANDEX_TASK_IDS.has(taskId) &&
      !OZON_TASK_IDS.has(taskId)
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
      ...this.serializeQuestionProgress(question),
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
      return {
        questionId: current.questionId,
        ...this.serializeQuestionProgress(current),
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
        return {
          questionId: duplicate.questionId,
          ...this.serializeQuestionProgress(duplicate),
        };
      }
    }
    if (!question) {
      throw new InternalServerErrorException("Не удалось сохранить повторение");
    }
    return {
      questionId: question.questionId,
      ...this.serializeQuestionProgress(question),
    };
  }

  async submitAiLessonQuiz(itemId: string, dto: SubmitLessonQuizDto) {
    const course = await this.aiCourseModel.findOne({ key: "main" }).lean().exec();
    if (!course) throw new NotFoundException("Сначала создай AI-курс");
    return this.submitLessonQuiz(course.key, course.version, itemId, dto);
  }

  async submitYandexLessonQuiz(blockId: string, dto: SubmitLessonQuizDto) {
    this.getYandexBlock(blockId);
    return this.submitLessonQuiz(
      YANDEX_SPRINT_AI_KEY,
      YANDEX_SPRINT_AI_VERSION,
      blockId,
      dto,
    );
  }

  async submitOzonLessonQuiz(blockId: string, dto: SubmitLessonQuizDto) {
    this.getOzonBlock(blockId);
    return this.submitLessonQuiz(
      OZON_SPRINT_AI_KEY,
      OZON_SPRINT_AI_VERSION,
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
        return this.serializeQuizProgress(existing);
      }
      const progress = await this.aiQuizProgressModel
        .findOneAndUpdate(
          { ...progressFilter, "attempts.operationId": { $ne: dto.operationId } },
          { $push: { attempts: attempt } },
          { returnDocument: "after", lean: true },
        )
        .exec();
      if (progress) return this.serializeQuizProgress(progress);
      const duplicate = await this.aiQuizProgressModel.findOne(progressFilter).lean().exec();
      if (duplicate) return this.serializeQuizProgress(duplicate);
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
    return this.serializeQuizProgress(progress);
  }

  async getCurrentMockInterview() {
    const interview = await this.mockInterviewModel
      .findOne({ status: "in_progress" })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return interview ? this.serializeMockInterview(interview) : null;
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
    return this.serializeMockInterview(interview);
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
    return this.serializeMockInterview(interview);
  }

  async completeMockInterview(interviewId: string) {
    const interview = await this.getMockInterviewDocument(interviewId);
    if (interview.status === "completed") return this.serializeMockInterview(interview);
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
    return this.serializeMockInterview(interview);
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

  private serializeAiCourse(course: AiCourse) {
    return {
      title: course.title,
      summary: course.summary,
      goal: course.goal,
      level: course.level,
      deadline: course.deadline,
      dailyMinutes: course.dailyMinutes,
      targetCompanies: course.targetCompanies,
      weakTopics: course.weakTopics,
      version: course.version,
      generatedAt: course.generatedAt,
      items: course.items.map((item) => ({
        id: item.id,
        title: item.title,
        objective: item.objective,
        estimatedMinutes: item.estimatedMinutes,
        resourceIds: item.resourceIds,
      })),
    };
  }

  private serializeAiLesson(lesson: AiLesson) {
    return {
      itemId: lesson.itemId,
      title: lesson.title,
      goals: lesson.goals,
      explanation: lesson.explanation,
      codeExamples: lesson.codeExamples,
      diagrams: lesson.diagrams ?? [],
      commonMistakes: lesson.commonMistakes,
      interviewQuestions: lesson.interviewQuestions,
      practice: lesson.practice,
      quiz: lesson.quiz ?? [],
      summary: lesson.summary,
      resourceIds: lesson.resourceIds,
      version: lesson.version,
      generatedAt: lesson.generatedAt,
    };
  }

  private serializeQuestionProgress(question: QuestionProgress) {
    return {
      status: question.status ?? "new",
      note: question.note ?? "",
      easeFactor: question.easeFactor ?? 2.5,
      intervalDays: question.intervalDays ?? 0,
      repetitions: question.repetitions ?? 0,
      nextReviewAt: question.nextReviewAt?.toISOString() ?? null,
      lastReviewedAt: question.lastReviewedAt?.toISOString() ?? null,
      reviewCount: question.reviewCount ?? 0,
      lapseCount: question.lapseCount ?? 0,
      lastRating: question.lastRating ?? null,
    };
  }

  private serializeQuizProgress(progress: AiQuizProgress) {
    return {
      itemId: progress.itemId,
      lessonVersion: progress.lessonVersion,
      attempts: progress.attempts.map((attempt) => ({
        score: attempt.score,
        answers: attempt.answers.map((answer) => ({
          questionId: answer.questionId,
          selectedOptionIndex: answer.selectedOptionIndex,
          correct: answer.correct,
          topic: answer.topic,
        })),
        completedAt: attempt.completedAt.toISOString(),
      })),
    };
  }

  private serializeQuizProgressCollection(
    progresses: AiQuizProgress[],
    aiCourse: AiCourse | null,
  ) {
    const result = {
      course: {} as Record<string, ReturnType<LearningService["serializeQuizProgress"]>>,
      yandex: {} as Record<string, ReturnType<LearningService["serializeQuizProgress"]>>,
      ozon: {} as Record<string, ReturnType<LearningService["serializeQuizProgress"]>>,
    };
    for (const progress of progresses) {
      const scope =
        progress.courseKey === YANDEX_SPRINT_AI_KEY &&
        progress.courseVersion === YANDEX_SPRINT_AI_VERSION
          ? "yandex"
          : progress.courseKey === OZON_SPRINT_AI_KEY &&
              progress.courseVersion === OZON_SPRINT_AI_VERSION
            ? "ozon"
            : aiCourse &&
                progress.courseKey === aiCourse.key &&
                progress.courseVersion === aiCourse.version
              ? "course"
              : null;
      if (!scope || result[scope][progress.itemId]) continue;
      result[scope][progress.itemId] = this.serializeQuizProgress(progress);
    }
    return result;
  }

  private serializeMockInterview(interview: MockInterview & { _id: unknown }) {
    const questionMap = new Map(QUESTION_BANK.map((question) => [question.id, question]));
    return {
      id: String(interview._id),
      status: interview.status,
      durationMinutes: interview.durationMinutes,
      startedAt: interview.startedAt.toISOString(),
      completedAt: interview.completedAt?.toISOString() ?? null,
      questions: interview.questionIds.flatMap((questionId) => {
        const question = questionMap.get(questionId);
        return question ? [question] : [];
      }),
      answers: Object.fromEntries(
        interview.answers.map((answer) => [answer.questionId, answer.content]),
      ),
      evaluation: interview.evaluation
        ? {
            overallScore: interview.evaluation.overallScore,
            summary: interview.evaluation.summary,
            strengths: interview.evaluation.strengths,
            weakTopics: interview.evaluation.weakTopics,
            questions: interview.evaluation.questions,
          }
        : null,
    };
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

  private async getYandexAiChatScope(blockId: string): Promise<AiChatScope> {
    const { day, block } = this.getYandexBlock(blockId);
    const lesson = await this.aiLessonModel
      .findOne({
        courseKey: YANDEX_SPRINT_AI_KEY,
        courseVersion: YANDEX_SPRINT_AI_VERSION,
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
      courseKey: YANDEX_SPRINT_AI_KEY,
      courseVersion: YANDEX_SPRINT_AI_VERSION,
      itemId: blockId,
      title: block.title,
      context: buildYandexAiChatContext({ day, block, lesson, resources }),
    };
  }

  private async getOzonAiChatScope(blockId: string): Promise<AiChatScope> {
    const { day, block } = this.getOzonBlock(blockId);
    const lesson = await this.aiLessonModel
      .findOne({
        courseKey: OZON_SPRINT_AI_KEY,
        courseVersion: OZON_SPRINT_AI_VERSION,
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
      courseKey: OZON_SPRINT_AI_KEY,
      courseVersion: OZON_SPRINT_AI_VERSION,
      itemId: blockId,
      title: block.title,
      context: buildOzonAiChatContext({ day, block, lesson, resources }),
    };
  }

  private getYandexBlock(blockId: string) {
    for (const day of YANDEX_SPRINT) {
      const block = day.blocks.find((candidate) => candidate.id === blockId);
      if (block) return { day, block };
    }
    throw new NotFoundException("Тема Яндекс-спринта не найдена");
  }

  private getOzonBlock(blockId: string) {
    for (const day of OZON_SPRINT) {
      const block = day.blocks.find((candidate) => candidate.id === blockId);
      if (block) return { day, block };
    }
    throw new NotFoundException("Тема Ozon-спринта не найдена");
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
