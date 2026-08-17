import type {
  QuestionStatus,
  ReviewRating,
} from "./schemas/question-progress.schema";

export interface ReviewScheduleInput {
  easeFactor?: number;
  intervalDays?: number;
  repetitions?: number;
  reviewCount?: number;
  lapseCount?: number;
}

export interface ReviewSchedule {
  status: QuestionStatus;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date;
  lastReviewedAt: Date;
  reviewCount: number;
  lapseCount: number;
  lastRating: ReviewRating;
}

const MIN_EASE_FACTOR = 1.3;

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export function scheduleQuestionReview(
  progress: ReviewScheduleInput,
  rating: ReviewRating,
  reviewedAt = new Date(),
): ReviewSchedule {
  const currentEase = Math.max(MIN_EASE_FACTOR, progress.easeFactor ?? 2.5);
  const currentInterval = Math.max(0, progress.intervalDays ?? 0);
  const currentRepetitions = Math.max(0, progress.repetitions ?? 0);
  let easeFactor = currentEase;
  let repetitions = currentRepetitions;
  let intervalDays = currentInterval;
  let lapseCount = Math.max(0, progress.lapseCount ?? 0);

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
    status:
      intervalDays >= 30
        ? "mastered"
        : rating === "again" || rating === "hard"
          ? "learning"
          : "review",
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt: addDays(reviewedAt, intervalDays),
    lastReviewedAt: reviewedAt,
    reviewCount: Math.max(0, progress.reviewCount ?? 0) + 1,
    lapseCount,
    lastRating: rating,
  };
}
