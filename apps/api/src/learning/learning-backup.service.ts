import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import {
  LEARNING_BACKUP_FORMAT,
  LEARNING_BACKUP_VERSION,
  parseLearningBackup,
  type LearningBackupRecord,
} from "./backup";
import type { ImportBackupDto } from "./dto/learning.dto";
import { AlgorithmEntry } from "./schemas/algorithm-entry.schema";
import { AiChatMessage } from "./schemas/ai-chat-message.schema";
import { AiCourse, AiLesson } from "./schemas/ai-course.schema";
import { AiQuizProgress } from "./schemas/ai-quiz-progress.schema";
import { MockInterview } from "./schemas/mock-interview.schema";
import { QuestionProgress } from "./schemas/question-progress.schema";
import { Settings } from "./schemas/settings.schema";
import { TaskProgress } from "./schemas/task-progress.schema";

@Injectable()
export class LearningBackupService {
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
  ) {}

  async exportBackup() {
    const [
      settings,
      tasks,
      questions,
      algorithms,
      aiCourses,
      aiLessons,
      aiChatMessages,
      aiQuizProgresses,
      mockInterviews,
    ] = await Promise.all([
      this.settingsModel.find().lean().exec(),
      this.taskModel.find().lean().exec(),
      this.questionModel.find().lean().exec(),
      this.algorithmModel.find().lean().exec(),
      this.aiCourseModel.find().lean().exec(),
      this.aiLessonModel.find().lean().exec(),
      this.aiChatMessageModel.find().lean().exec(),
      this.aiQuizProgressModel.find().lean().exec(),
      this.mockInterviewModel.find().lean().exec(),
    ]);

    return {
      format: LEARNING_BACKUP_FORMAT,
      version: LEARNING_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        tasks,
        questions,
        algorithms,
        aiCourses,
        aiLessons,
        aiChatMessages,
        aiQuizProgresses,
        mockInterviews,
      },
    };
  }

  async importBackup(dto: ImportBackupDto) {
    const backup = parseLearningBackup(dto.backup);
    const prepared = {
      settings: await this.validateRecords(this.settingsModel, backup.data.settings),
      tasks: await this.validateRecords(this.taskModel, backup.data.tasks),
      questions: await this.validateRecords(this.questionModel, backup.data.questions),
      algorithms: await this.validateRecords(
        this.algorithmModel,
        backup.data.algorithms,
      ),
      aiCourses: await this.validateRecords(
        this.aiCourseModel,
        backup.data.aiCourses,
      ),
      aiLessons: await this.validateRecords(
        this.aiLessonModel,
        backup.data.aiLessons,
      ),
      aiChatMessages: await this.validateRecords(
        this.aiChatMessageModel,
        backup.data.aiChatMessages,
      ),
      aiQuizProgresses: await this.validateRecords(
        this.aiQuizProgressModel,
        backup.data.aiQuizProgresses,
      ),
      mockInterviews: await this.validateRecords(
        this.mockInterviewModel,
        backup.data.mockInterviews,
      ),
    };

    await Promise.all([
      this.mergeRecords(this.settingsModel, prepared.settings, (record) => ({
        key: record.key,
      })),
      this.mergeRecords(this.taskModel, prepared.tasks, (record) => ({
        taskId: record.taskId,
      })),
      this.mergeRecords(this.questionModel, prepared.questions, (record) => ({
        questionId: record.questionId,
      })),
      this.mergeRecords(this.algorithmModel, prepared.algorithms, (record) => ({
        _id: record._id,
      })),
      this.mergeRecords(this.aiCourseModel, prepared.aiCourses, (record) => ({
        key: record.key,
      })),
      this.mergeRecords(this.aiLessonModel, prepared.aiLessons, (record) => ({
        courseKey: record.courseKey,
        courseVersion: record.courseVersion,
        itemId: record.itemId,
      })),
      this.mergeRecords(this.aiChatMessageModel, prepared.aiChatMessages, (record) => ({
        _id: record._id,
      })),
      this.mergeRecords(
        this.aiQuizProgressModel,
        prepared.aiQuizProgresses,
        (record) => ({
          courseKey: record.courseKey,
          courseVersion: record.courseVersion,
          itemId: record.itemId,
          lessonVersion: record.lessonVersion,
        }),
      ),
      this.mergeRecords(
        this.mockInterviewModel,
        prepared.mockInterviews,
        (record) => ({ _id: record._id }),
      ),
    ]);

    const imported = Object.fromEntries(
      Object.entries(prepared).map(([collection, records]) => [
        collection,
        records.length,
      ]),
    );
    return {
      imported,
      total: Object.values(imported).reduce((sum, count) => sum + count, 0),
    };
  }

  private async validateRecords<T>(
    model: Model<T>,
    records: LearningBackupRecord[],
  ): Promise<LearningBackupRecord[]> {
    return Promise.all(
      records.map(async (record) => {
        const document = new model(record);
        try {
          await document.validate();
        } catch {
          throw new BadRequestException(
            "Бэкап содержит данные, несовместимые с текущей версией",
          );
        }
        return document.toObject({ versionKey: false }) as LearningBackupRecord;
      }),
    );
  }

  private async mergeRecords<T>(
    model: Model<T>,
    records: LearningBackupRecord[],
    getFilter: (record: LearningBackupRecord) => LearningBackupRecord,
  ) {
    if (records.length === 0) return;
    const operations = records.map((record) => {
      const update = { ...record };
      delete update._id;
      return {
        updateOne: {
          filter: getFilter(record),
          update: { $set: update },
          upsert: true,
        },
      };
    });
    await model.bulkWrite(operations as Parameters<typeof model.bulkWrite>[0]);
  }
}
