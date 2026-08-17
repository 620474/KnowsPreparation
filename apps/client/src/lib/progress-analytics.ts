import { isQuestionDue } from "./review-queue";
import { normalizeQuestionProgress } from "./question-progress";
import type { BootstrapData } from "../types";

const statusWeakness = { new: 3, learning: 6, review: 4, mastered: 0 } as const;

export function calculateProgressAnalytics(data: BootstrapData, now = new Date()) {
  const categories = new Map<
    string,
    { total: number; mastered: number; due: number; weakness: number }
  >();
  let mastered = 0;
  let due = 0;
  let reviewCount = 0;

  for (const question of data.questions) {
    const progress = normalizeQuestionProgress(data.progress.questions[question.id]);
    const category = categories.get(question.category) ?? {
      total: 0,
      mastered: 0,
      due: 0,
      weakness: 0,
    };
    const questionDue = isQuestionDue(progress, now);
    category.total += 1;
    category.mastered += progress.status === "mastered" ? 1 : 0;
    category.due += questionDue ? 1 : 0;
    category.weakness +=
      statusWeakness[progress.status] +
      progress.lapseCount * 2 +
      (questionDue ? 2 : 0);
    categories.set(question.category, category);
    mastered += progress.status === "mastered" ? 1 : 0;
    due += questionDue ? 1 : 0;
    reviewCount += progress.reviewCount;
  }

  const topicWeakness = new Map<string, number>();
  const quizGroups = Object.values(data.ai.quizProgress).flatMap((scope) =>
    Object.values(scope),
  );
  for (const progress of quizGroups) {
    const latestAttempt = progress.attempts.at(-1);
    for (const answer of latestAttempt?.answers ?? []) {
      if (!answer.correct) {
        topicWeakness.set(answer.topic, (topicWeakness.get(answer.topic) ?? 0) + 3);
      }
    }
  }
  const completedMocks = data.mockInterviews.filter(
    (interview) => interview.status === "completed" && interview.evaluation,
  );
  for (const interview of completedMocks) {
    for (const topic of interview.evaluation?.weakTopics ?? []) {
      topicWeakness.set(topic, (topicWeakness.get(topic) ?? 0) + 4);
    }
  }
  const averageMockScore = completedMocks.length
    ? Math.round(
        completedMocks.reduce(
          (sum, interview) => sum + (interview.evaluation?.overallScore ?? 0),
          0,
        ) / completedMocks.length,
      )
    : null;

  return {
    mastered,
    due,
    reviewCount,
    completedMocks: completedMocks.length,
    averageMockScore,
    categories: [...categories.entries()]
      .map(([name, value]) => ({
        name,
        ...value,
        masteryPercent: Math.round((value.mastered / value.total) * 100),
      }))
      .sort((left, right) => right.weakness - left.weakness),
    weakTopics: [...topicWeakness.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([topic, score]) => ({ topic, score })),
  };
}
