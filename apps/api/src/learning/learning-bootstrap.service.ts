import { createHash } from "node:crypto";

import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { AiContentService } from "./ai-content.service";
import {
  ALGORITHM_PATTERNS,
  CURRICULUM,
  CURRICULUM_BUFFER_WEEKS,
  CURRICULUM_CORE_WEEKS,
  QUESTION_BANK,
} from "./curriculum";
import {
  serializeAiCourse,
  serializeLessonCollection,
  serializeMockInterview,
  serializePracticeProgressCollection,
  serializeQuestionProgress,
  serializeQuizProgressCollection,
} from "./learning-serialization";
import { RESOURCES } from "./resources";
import { AlgorithmEntry } from "./schemas/algorithm-entry.schema";
import { AiCourse, AiLesson } from "./schemas/ai-course.schema";
import { AiPracticeProgress } from "./schemas/ai-practice-progress.schema";
import { AiQuizProgress } from "./schemas/ai-quiz-progress.schema";
import { MockInterview } from "./schemas/mock-interview.schema";
import { QuestionProgress } from "./schemas/question-progress.schema";
import { Settings } from "./schemas/settings.schema";
import { TaskProgress } from "./schemas/task-progress.schema";
import { getStaticTrack, STATIC_TRACK_LIST } from "./track-registry";

const STATIC_CONTENT = {
  curriculum: CURRICULUM,
  yandexSprint: getStaticTrack("yandex").days,
  ozonSprint: getStaticTrack("ozon").days,
  resources: RESOURCES,
  questions: QUESTION_BANK,
  algorithmPatterns: ALGORITHM_PATTERNS,
};

const CONTENT_VERSION = createHash("sha256")
  .update(JSON.stringify(STATIC_CONTENT))
  .digest("base64url")
  .slice(0, 16);

@Injectable()
export class LearningBootstrapService {
  readonly contentEtag = `"${CONTENT_VERSION}"`;

  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(TaskProgress.name) private readonly taskModel: Model<TaskProgress>,
    @InjectModel(QuestionProgress.name)
    private readonly questionModel: Model<QuestionProgress>,
    @InjectModel(AlgorithmEntry.name)
    private readonly algorithmModel: Model<AlgorithmEntry>,
    @InjectModel(AiCourse.name) private readonly aiCourseModel: Model<AiCourse>,
    @InjectModel(AiLesson.name) private readonly aiLessonModel: Model<AiLesson>,
    @InjectModel(AiPracticeProgress.name)
    private readonly aiPracticeProgressModel: Model<AiPracticeProgress>,
    @InjectModel(AiQuizProgress.name)
    private readonly aiQuizProgressModel: Model<AiQuizProgress>,
    @InjectModel(MockInterview.name)
    private readonly mockInterviewModel: Model<MockInterview>,
    private readonly aiContent: AiContentService,
  ) {}

  getContent() {
    return { contentVersion: CONTENT_VERSION, ...STATIC_CONTENT };
  }

  async getProgress() {
    const today = new Date().toISOString().slice(0, 10);
    const settings = await this.settingsModel
      .findOneAndUpdate(
        { key: "main" },
        {
          $set: {
            coreWeeks: CURRICULUM_CORE_WEEKS,
            bufferWeeks: CURRICULUM_BUFFER_WEEKS,
          },
          $setOnInsert: {
            key: "main",
            startDate: today,
            dailyMinutes: 120,
            reminderEnabled: false,
            reminderTime: "19:00",
            adaptiveTodayEnabled: true,
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
    // Один запрос на все треки: персональный курс плюс статические программы.
    const lessonScopes = [
      ...STATIC_TRACK_LIST.map((track) => ({
        courseKey: track.courseKey,
        courseVersion: track.courseVersion,
      })),
      ...(aiCourse
        ? [{ courseKey: aiCourse.key, courseVersion: aiCourse.version }]
        : []),
    ];
    const [lessons, quizProgresses, practiceProgresses] = await Promise.all([
      this.aiLessonModel
        .find({ $or: lessonScopes })
        .sort({ updatedAt: -1 })
        .lean()
        .exec(),
      this.aiQuizProgressModel.find().sort({ updatedAt: -1 }).lean().exec(),
      this.aiPracticeProgressModel.find().sort({ updatedAt: -1 }).lean().exec(),
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
        reminderEnabled: settings.reminderEnabled ?? false,
        reminderTime: settings.reminderTime ?? "19:00",
        adaptiveTodayEnabled: settings.adaptiveTodayEnabled ?? true,
      },
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
            serializeQuestionProgress(question),
          ]),
        ),
      },
      mockInterviews: mockInterviews.map(serializeMockInterview),
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
        course: aiCourse ? serializeAiCourse(aiCourse) : null,
        lessons: serializeLessonCollection(lessons, aiCourse),
        quizProgress: serializeQuizProgressCollection(quizProgresses, aiCourse),
        practiceProgress: serializePracticeProgressCollection(
          practiceProgresses,
          aiCourse,
        ),
      },
    };
  }

}
