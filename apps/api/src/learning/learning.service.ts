import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { AiContentService } from "./ai-content.service";
import { buildAiChatContext, buildYandexAiChatContext } from "./ai-chat";
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
  YANDEX_SPRINT,
  YANDEX_SPRINT_AI_KEY,
  YANDEX_SPRINT_AI_VERSION,
  YANDEX_TASK_IDS,
} from "./yandex-sprint";
import {
  CreateAlgorithmDto,
  GenerateAiCourseDto,
  SendAiChatMessageDto,
  UpdateQuestionDto,
  UpdateSettingsDto,
  UpdateTaskDto,
} from "./dto/learning.dto";
import { AlgorithmEntry } from "./schemas/algorithm-entry.schema";
import { AiChatMessage } from "./schemas/ai-chat-message.schema";
import { AiCourse, AiLesson } from "./schemas/ai-course.schema";
import { QuestionProgress } from "./schemas/question-progress.schema";
import { Settings } from "./schemas/settings.schema";
import { TaskProgress } from "./schemas/task-progress.schema";
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
    const [tasks, questions, algorithms, aiCourse] = await Promise.all([
      this.taskModel.find().lean().exec(),
      this.questionModel.find().lean().exec(),
      this.algorithmModel.find().sort({ solvedAt: -1, createdAt: -1 }).lean().exec(),
      this.aiCourseModel.findOne({ key: "main" }).lean().exec(),
    ]);
    const [aiLessons, yandexLessons] = await Promise.all([
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
            { status: question.status, note: question.note ?? "" },
          ]),
        ),
      },
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

  async generateAiLesson(itemId: string) {
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

  async generateYandexLesson(blockId: string) {
    const { day, block } = this.getYandexBlock(blockId);
    if (block.kind === "review") {
      throw new BadRequestException("Для блока разбора отдельный AI-урок не требуется");
    }
    const resourceMap = new Map(RESOURCES.map((resource) => [resource.id, resource]));
    const resources = block.resourceIds.flatMap((resourceId) => {
      const resource = resourceMap.get(resourceId);
      return resource ? [resource] : [];
    });
    const generated = await this.aiContent.generateYandexLesson(day, block, resources);
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

  async getAiChat(itemId: string) {
    return this.readAiChat(await this.getAiChatScope(itemId));
  }

  async getYandexAiChat(blockId: string) {
    return this.readAiChat(await this.getYandexAiChatScope(blockId));
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

  async sendAiChatMessage(itemId: string, dto: SendAiChatMessageDto) {
    return this.replyToAiChat(await this.getAiChatScope(itemId), dto);
  }

  async sendYandexAiChatMessage(blockId: string, dto: SendAiChatMessageDto) {
    return this.replyToAiChat(await this.getYandexAiChatScope(blockId), dto);
  }

  private async replyToAiChat(scope: AiChatScope, dto: SendAiChatMessageDto) {
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
    const reply = await this.aiContent.generateChatReply(scope.context, history, content);
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
    if (!TASK_IDS.has(taskId) && !YANDEX_TASK_IDS.has(taskId)) {
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

    const question = await this.questionModel
      .findOneAndUpdate(
        { questionId },
        { $set: { status: dto.status, note: dto.note ?? "" } },
        { upsert: true, returnDocument: "after", lean: true },
      )
      .exec();
    if (!question) {
      throw new InternalServerErrorException("Не удалось сохранить вопрос");
    }
    return {
      questionId: question.questionId,
      status: question.status,
      note: question.note,
    };
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
      summary: lesson.summary,
      resourceIds: lesson.resourceIds,
      version: lesson.version,
      generatedAt: lesson.generatedAt,
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

  private getYandexBlock(blockId: string) {
    for (const day of YANDEX_SPRINT) {
      const block = day.blocks.find((candidate) => candidate.id === blockId);
      if (block) return { day, block };
    }
    throw new NotFoundException("Тема Яндекс-спринта не найдена");
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
