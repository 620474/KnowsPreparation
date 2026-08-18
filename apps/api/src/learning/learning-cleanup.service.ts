import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { AiChatMessage } from "./schemas/ai-chat-message.schema";
import { AiLesson } from "./schemas/ai-course.schema";
import { AiPracticeProgress } from "./schemas/ai-practice-progress.schema";
import { AiQuizProgress } from "./schemas/ai-quiz-progress.schema";

export interface CourseVersionPruneResult {
  lessons: number;
  chatMessages: number;
  quizProgress: number;
  practiceProgress: number;
}

export interface LessonVersionPruneResult {
  quizProgress: number;
  practiceProgress: number;
  carriedSolution: boolean;
}

/**
 * Удаляет данные, привязанные к устаревшим версиям курса и уроков.
 *
 * Курс и уроки версионируются при каждой перегенерации, а `bootstrap` читает
 * только актуальную версию. Без очистки старые документы остаются в базе
 * навсегда и продолжают попадать в выборку прогресса.
 */
@Injectable()
export class LearningCleanupService {
  private readonly logger = new Logger(LearningCleanupService.name);

  constructor(
    @InjectModel(AiLesson.name)
    private readonly aiLessonModel: Model<AiLesson>,
    @InjectModel(AiChatMessage.name)
    private readonly aiChatMessageModel: Model<AiChatMessage>,
    @InjectModel(AiQuizProgress.name)
    private readonly aiQuizProgressModel: Model<AiQuizProgress>,
    @InjectModel(AiPracticeProgress.name)
    private readonly aiPracticeProgressModel: Model<AiPracticeProgress>,
  ) {}

  /**
   * Удаляет уроки, чат, результаты тестов и решения практики от предыдущих
   * версий курса. Темы новой версии получают новые идентификаторы, поэтому
   * старые данные недостижимы.
   */
  async pruneCourseVersions(
    courseKey: string,
    currentVersion: number,
  ): Promise<CourseVersionPruneResult> {
    const filter = { courseKey, courseVersion: { $lt: currentVersion } };
    const [lessons, chatMessages, quizProgress, practiceProgress] = await Promise.all([
      this.aiLessonModel.deleteMany(filter).exec(),
      this.aiChatMessageModel.deleteMany(filter).exec(),
      this.aiQuizProgressModel.deleteMany(filter).exec(),
      this.aiPracticeProgressModel.deleteMany(filter).exec(),
    ]);
    const result: CourseVersionPruneResult = {
      lessons: lessons.deletedCount,
      chatMessages: chatMessages.deletedCount,
      quizProgress: quizProgress.deletedCount,
      practiceProgress: practiceProgress.deletedCount,
    };
    if (Object.values(result).some((count) => count > 0)) {
      this.logger.log({
        event: "course_versions_pruned",
        courseKey,
        currentVersion,
        ...result,
      });
    }
    return result;
  }

  /**
   * Удаляет результаты тестов от предыдущих версий урока и переносит последнее
   * решение практики в актуальную версию, чтобы код пользователя не пропадал
   * после перегенерации статьи.
   */
  async pruneLessonVersions(
    courseKey: string,
    courseVersion: number,
    itemId: string,
    currentLessonVersion: number,
  ): Promise<LessonVersionPruneResult> {
    const scope = { courseKey, courseVersion, itemId };
    const staleFilter = { ...scope, lessonVersion: { $lt: currentLessonVersion } };
    const carriedSolution = await this.carryPracticeSolution(
      scope,
      currentLessonVersion,
    );
    const [quizProgress, practiceProgress] = await Promise.all([
      this.aiQuizProgressModel.deleteMany(staleFilter).exec(),
      this.aiPracticeProgressModel.deleteMany(staleFilter).exec(),
    ]);
    const result: LessonVersionPruneResult = {
      quizProgress: quizProgress.deletedCount,
      practiceProgress: practiceProgress.deletedCount,
      carriedSolution,
    };
    if (result.quizProgress > 0 || result.practiceProgress > 0) {
      this.logger.log({
        event: "lesson_versions_pruned",
        courseKey,
        courseVersion,
        itemId,
        currentLessonVersion,
        ...result,
      });
    }
    return result;
  }

  private async carryPracticeSolution(
    scope: { courseKey: string; courseVersion: number; itemId: string },
    currentLessonVersion: number,
  ) {
    const current = await this.aiPracticeProgressModel
      .findOne({ ...scope, lessonVersion: currentLessonVersion })
      .lean()
      .exec();
    if (current) return false;

    const previous = await this.aiPracticeProgressModel
      .findOne({
        ...scope,
        lessonVersion: { $lt: currentLessonVersion },
        solution: { $ne: "" },
      })
      .sort({ lessonVersion: -1 })
      .lean()
      .exec();
    if (!previous) return false;

    try {
      await this.aiPracticeProgressModel.create({
        ...scope,
        lessonVersion: currentLessonVersion,
        solution: previous.solution,
        revision: 1,
        lastOperationId: null,
      });
      return true;
    } catch {
      // Документ успел появиться параллельно: уникальный индекс уже защитил данные.
      return false;
    }
  }
}
