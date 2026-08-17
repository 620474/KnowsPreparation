import { normalizeQuestionProgress } from "./question-progress";
import type { InterviewQuestion, QuestionProgress } from "../types";

export interface ReviewQueueItem {
  question: InterviewQuestion;
  progress: QuestionProgress;
  isNew: boolean;
}

export const isQuestionDue = (progress: QuestionProgress, now = new Date()) =>
  progress.status !== "new" &&
  (!progress.nextReviewAt || new Date(progress.nextReviewAt).getTime() <= now.getTime());

export function buildReviewQueue(
  questions: InterviewQuestion[],
  progressMap: Record<string, QuestionProgress>,
  now = new Date(),
  newQuestionLimit = 5,
) {
  const scheduled = questions
    .map((question) => ({
      question,
      progress: normalizeQuestionProgress(progressMap[question.id]),
      isNew: false,
    }))
    .filter((item) => isQuestionDue(item.progress, now))
    .sort((left, right) => {
      const leftDate = left.progress.nextReviewAt
        ? new Date(left.progress.nextReviewAt).getTime()
        : 0;
      const rightDate = right.progress.nextReviewAt
        ? new Date(right.progress.nextReviewAt).getTime()
        : 0;
      return leftDate - rightDate;
    });
  const fresh = questions
    .filter((question) => normalizeQuestionProgress(progressMap[question.id]).status === "new")
    .slice(0, newQuestionLimit)
    .map((question) => ({
      question,
      progress: normalizeQuestionProgress(progressMap[question.id]),
      isNew: true,
    }));

  return [...scheduled, ...fresh];
}
