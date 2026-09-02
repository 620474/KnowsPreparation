import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { SKILL_KEYS, type LearningAnalytics, type SkillKey } from "@prep/contracts";
import type { Model } from "mongoose";

import { LearningSignal } from "./schemas/learning-signal.schema";
import { buildReadiness } from "./readiness";
import { SKILL_DEFINITIONS } from "./skills";

const DAY_MS = 86_400_000;

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const signalScore = (signal: LearningSignal): number | null => {
  if (signal.type === "practice_attempted") {
    const passed = numberValue(signal.payload.passedCount);
    const total = numberValue(signal.payload.totalCount);
    return passed !== null && total ? Math.round((passed / total) * 100) : null;
  }
  if (signal.type === "quiz_submitted") {
    const score = numberValue(signal.payload.score);
    const maxScore = numberValue(signal.payload.maxScore);
    return score !== null && maxScore ? Math.round((score / maxScore) * 100) : null;
  }
  if (signal.type === "question_reviewed") {
    const rating = signal.payload.rating;
    return rating === "again" ? 0 : rating === "hard" ? 40 : rating === "good" ? 75 : 100;
  }
  if (signal.type === "mock_completed") {
    return numberValue(signal.payload.score);
  }
  return null;
};

const average = (values: number[]) =>
  values.length > 0
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;

@Injectable()
export class LearningAnalyticsService {
  constructor(
    @InjectModel(LearningSignal.name)
    private readonly signalModel: Model<LearningSignal>,
  ) {}

  async getAnalytics(windowDays: number, now = new Date()): Promise<LearningAnalytics> {
    const endDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    ));
    const startDate = new Date(endDate.getTime() - windowDays * DAY_MS);
    const signals = await this.signalModel
      .find({
        occurredAt: { $gte: startDate, $lt: endDate },
        type: { $ne: "recommendation_skipped" },
      })
      .sort({ occurredAt: 1 })
      .lean()
      .exec();
    const days = Array.from({ length: windowDays }, (_, index) => {
      const date = new Date(startDate.getTime() + index * DAY_MS)
        .toISOString()
        .slice(0, 10);
      return {
        date,
        activityCount: 0,
        practiceAttempts: 0,
        practicePassed: 0,
        quizAttempts: 0,
        quizScores: [] as number[],
        reviews: 0,
        mocks: 0,
        mockScores: [] as number[],
      };
    });
    const dayMap = new Map(days.map((day) => [day.date, day]));
    const skillScores = new Map<SkillKey, number[]>();
    const skillCounts = new Map<SkillKey, number>();

    for (const signal of signals) {
      const day = dayMap.get(signal.occurredAt.toISOString().slice(0, 10));
      if (!day) continue;
      day.activityCount += 1;
      if (signal.type === "practice_attempted") {
        day.practiceAttempts += 1;
        if (signal.payload.passed === true) day.practicePassed += 1;
      } else if (signal.type === "quiz_submitted") {
        day.quizAttempts += 1;
        const score = signalScore(signal);
        if (score !== null) day.quizScores.push(score);
      } else if (signal.type === "question_reviewed") {
        day.reviews += 1;
      } else if (signal.type === "mock_completed") {
        day.mocks += 1;
        const score = signalScore(signal);
        if (score !== null) day.mockScores.push(score);
      }
      const score = signalScore(signal);
      for (const skill of signal.skillKeys) {
        skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
        if (score !== null) {
          const values = skillScores.get(skill) ?? [];
          values.push(score);
          skillScores.set(skill, values);
        }
      }
    }

    const practiceAttempts = days.reduce((sum, day) => sum + day.practiceAttempts, 0);
    const practicePassed = days.reduce((sum, day) => sum + day.practicePassed, 0);
    const quizScores = days.flatMap((day) => day.quizScores);
    const mockScores = days.flatMap((day) => day.mockScores);
    const readiness = buildReadiness(signals);
    return {
      windowDays,
      startedAt: signals[0]?.occurredAt.toISOString() ?? null,
      totals: {
        activityCount: signals.length,
        practiceAttempts,
        practicePassRate: practiceAttempts
          ? Math.round((practicePassed / practiceAttempts) * 100)
          : null,
        quizAttempts: days.reduce((sum, day) => sum + day.quizAttempts, 0),
        quizAverage: average(quizScores),
        reviews: days.reduce((sum, day) => sum + day.reviews, 0),
        mocks: days.reduce((sum, day) => sum + day.mocks, 0),
        mockAverage: average(mockScores),
      },
      days: days.map(({ quizScores: dayQuizScores, mockScores: dayMockScores, ...day }) => ({
        ...day,
        quizAverage: average(dayQuizScores),
        mockAverage: average(dayMockScores),
      })),
      skills: SKILL_KEYS.map((key) => ({
        key,
        label: SKILL_DEFINITIONS[key],
        score: average(skillScores.get(key) ?? []),
        signalCount: skillCounts.get(key) ?? 0,
      })).sort((left, right) => {
        if (left.score === null) return 1;
        if (right.score === null) return -1;
        return left.score - right.score;
      }),
      readiness: readiness.dimensions,
    };
  }
}
