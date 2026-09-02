import type {
  TrackKey,
  PracticeAttemptSource,
  PracticeAttemptTelemetry,
  QuestionProgress,
  ReviewRating,
  SettingsPatch,
  TaskProgressPatch,
} from "../types";

export const OFFLINE_MUTATION_ROOT = ["offline"] as const;
export const offlineMutationKeys = {
  task: [...OFFLINE_MUTATION_ROOT, "task"] as const,
  question: [...OFFLINE_MUTATION_ROOT, "question"] as const,
  review: [...OFFLINE_MUTATION_ROOT, "review"] as const,
  quiz: [...OFFLINE_MUTATION_ROOT, "quiz"] as const,
  practiceAttempt: [...OFFLINE_MUTATION_ROOT, "practice-attempt"] as const,
  mockAnswer: [...OFFLINE_MUTATION_ROOT, "mock-answer"] as const,
  settings: [...OFFLINE_MUTATION_ROOT, "settings"] as const,
  deleteAlgorithm: [...OFFLINE_MUTATION_ROOT, "delete-algorithm"] as const,
  skipRecommendation: [...OFFLINE_MUTATION_ROOT, "skip-recommendation"] as const,
};

export type TaskMutationVariables = { taskId: string; progress: TaskProgressPatch };
export type QuestionMutationVariables = { questionId: string; progress: QuestionProgress };
export type ReviewMutationVariables = {
  questionId: string;
  rating: ReviewRating;
  note: string;
  operationId: string;
};
export type QuizMutationVariables = {
  track: TrackKey;
  itemId: string;
  answers: Array<{ questionId: string; selectedOptionIndex: number }>;
  operationId: string;
};
export type PracticeAttemptMutationVariables = {
  track: TrackKey;
  itemId: string;
  source: PracticeAttemptSource;
  lessonVersion?: number;
  solution: string;
  telemetry?: PracticeAttemptTelemetry;
  operationId: string;
};
export type MockAnswerMutationVariables = {
  interviewId: string;
  questionId: string;
  content: string;
};
export type SettingsMutationVariables = SettingsPatch;
export type SkipRecommendationMutationVariables = {
  recommendationId: string;
  operationId: string;
};

export const createOperationId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const isOfflineMutationKey = (mutationKey: readonly unknown[] | undefined) =>
  mutationKey?.[0] === OFFLINE_MUTATION_ROOT[0];
