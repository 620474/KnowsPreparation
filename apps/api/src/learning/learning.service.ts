import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  ALGORITHM_PATTERNS,
  CURRICULUM,
  QUESTION_BANK,
  QUESTION_IDS,
  TASK_IDS,
} from "./curriculum";
import { RESOURCES } from "./resources";
import { YANDEX_SPRINT, YANDEX_TASK_IDS } from "./yandex-sprint";
import {
  CreateAlgorithmDto,
  UpdateQuestionDto,
  UpdateSettingsDto,
  UpdateTaskDto,
} from "./dto/learning.dto";
import { AlgorithmEntry } from "./schemas/algorithm-entry.schema";
import { QuestionProgress } from "./schemas/question-progress.schema";
import { Settings } from "./schemas/settings.schema";
import { TaskProgress } from "./schemas/task-progress.schema";
import { buildTaskProgressUpdate } from "./task-progress";

@Injectable()
export class LearningService {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(TaskProgress.name) private readonly taskModel: Model<TaskProgress>,
    @InjectModel(QuestionProgress.name)
    private readonly questionModel: Model<QuestionProgress>,
    @InjectModel(AlgorithmEntry.name)
    private readonly algorithmModel: Model<AlgorithmEntry>,
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
    const [tasks, questions, algorithms] = await Promise.all([
      this.taskModel.find().lean().exec(),
      this.questionModel.find().lean().exec(),
      this.algorithmModel.find().sort({ solvedAt: -1, createdAt: -1 }).lean().exec(),
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
    };
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
}
