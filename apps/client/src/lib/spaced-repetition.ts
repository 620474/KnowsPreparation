import { normalizeQuestionProgress } from "./question-progress";
import type { QuestionProgress, ReviewRating } from "../types";

const MIN_EASE_FACTOR = 1.3;

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export function scheduleQuestionReview(
  progress: QuestionProgress,
  rating: ReviewRating,
  reviewedAt = new Date(),
): QuestionProgress {
  const current = normalizeQuestionProgress(progress);
  const currentEase = Math.max(MIN_EASE_FACTOR, current.easeFactor);
  const currentInterval = Math.max(0, current.intervalDays);
  const currentRepetitions = Math.max(0, current.repetitions);
  let easeFactor = currentEase;
  let repetitions = currentRepetitions;
  let intervalDays = currentInterval;
  let lapseCount = Math.max(0, current.lapseCount);

  if (rating === "again") {
    easeFactor = Math.max(MIN_EASE_FACTOR, currentEase - 0.2);
    repetitions = 0;
    intervalDays = 1;
    lapseCount += 1;
  } else if (rating === "hard") {
    easeFactor = Math.max(MIN_EASE_FACTOR, currentEase - 0.15);
    repetitions = Math.max(1, currentRepetitions);
    intervalDays = currentInterval <= 1 ? 1 : Math.max(2, Math.ceil(currentInterval * 1.2));
  } else if (rating === "good") {
    repetitions = currentRepetitions + 1;
    intervalDays =
      repetitions === 1
        ? 1
        : repetitions === 2
          ? 6
          : Math.max(2, Math.round(Math.max(1, currentInterval) * currentEase));
  } else {
    easeFactor = Math.min(3.2, currentEase + 0.15);
    repetitions = currentRepetitions + 1;
    intervalDays =
      repetitions === 1
        ? 4
        : Math.max(6, Math.ceil(Math.max(1, currentInterval) * easeFactor * 1.3));
  }

  return {
    ...current,
    status:
      rating === "again" || rating === "hard"
        ? "learning"
        : intervalDays >= 30
          ? "mastered"
          : "review",
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt: addDays(reviewedAt, intervalDays).toISOString(),
    lastReviewedAt: reviewedAt.toISOString(),
    reviewCount: Math.max(0, current.reviewCount) + 1,
    lapseCount,
    lastRating: rating,
  };
}
