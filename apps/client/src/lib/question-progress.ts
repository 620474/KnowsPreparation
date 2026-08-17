import type { QuestionProgress } from "../types";

export const EMPTY_QUESTION_PROGRESS: QuestionProgress = {
  status: "new",
  note: "",
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
  nextReviewAt: null,
  lastReviewedAt: null,
  reviewCount: 0,
  lapseCount: 0,
  lastRating: null,
};

export const normalizeQuestionProgress = (
  progress?: Partial<QuestionProgress>,
): QuestionProgress => ({
  ...EMPTY_QUESTION_PROGRESS,
  ...progress,
});
