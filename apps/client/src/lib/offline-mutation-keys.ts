import type {
  TrackKey,
  PracticeAttemptSource,
  PracticeAttemptTelemetry,
  LearningMissionAction,
  QuestionProgress,
  QuestionAttemptResult,
  ReviewRating,
  SettingsPatch,
  TaskProgressPatch,
} from "../types";

export const OFFLINE_MUTATION_ROOT = ["offline"] as const;
export const offlineMutationKeys = {
  task: [...OFFLINE_MUTATION_ROOT, "task"] as const,
  question: [...OFFLINE_MUTATION_ROOT, "question"] as const,
  review: [...OFFLINE_MUTATION_ROOT, "review"] as const,
  questionAttempt: [...OFFLINE_MUTATION_ROOT, "question-attempt"] as const,
  quiz: [...OFFLINE_MUTATION_ROOT, "quiz"] as const,
  practiceAttempt: [...OFFLINE_MUTATION_ROOT, "practice-attempt"] as const,
  mockAnswer: [...OFFLINE_MUTATION_ROOT, "mock-answer"] as const,
  settings: [...OFFLINE_MUTATION_ROOT, "settings"] as const,
  deleteAlgorithm: [...OFFLINE_MUTATION_ROOT, "delete-algorithm"] as const,
  skipRecommendation: [...OFFLINE_MUTATION_ROOT, "skip-recommendation"] as const,
  missionAction: [...OFFLINE_MUTATION_ROOT, "mission-action"] as const,
  transferAssessment: [...OFFLINE_MUTATION_ROOT, "transfer-assessment"] as const,
  interviewTurn: [...OFFLINE_MUTATION_ROOT, "interview-turn"] as const,
  checkpointAttempt: [...OFFLINE_MUTATION_ROOT, "checkpoint-attempt"] as const,
};

export type TaskMutationVariables = { taskId: string; progress: TaskProgressPatch };
export type QuestionMutationVariables = { questionId: string; progress: QuestionProgress };
export type ReviewMutationVariables = {
  questionId: string;
  rating: ReviewRating;
  note: string;
  operationId: string;
};
export type QuestionAttemptMutationVariables = {
  questionId: string;
  answer: string;
  explanation?: string;
  selectedOptionIndex?: number;
  confidence: number;
  responseTimeMs: number;
  operationId: string;
};
export type QuestionAttemptMutationResult = QuestionAttemptResult;
export type QuizMutationVariables = {
  track: TrackKey;
  itemId: string;
  tier: "legacy" | "core" | "deep";
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
export type MissionActionMutationVariables = {
  missionId: string;
  action: LearningMissionAction;
  operationId: string;
  deferredUntil?: string;
  note?: string;
};
export type TransferAssessmentMutationVariables = {
  missionId: string;
  answer: string;
  confidence: number;
  responseTimeMs: number;
  operationId: string;
};
export type InterviewTurnMutationVariables = {
  interviewId: string;
  answer: string;
  operationId: string;
};
export type CheckpointAttemptMutationVariables = {
  sessionId: string;
  leaseId: string;
  operationId: string;
  answer: string;
  explanation?: string;
  selectedOptionIndex?: number;
  confidenceBefore: number;
  confidenceAfter: number;
  durationMs: number;
  runCount?: number;
  failedTestCount?: number;
  revisionCount?: number;
  networkInterrupted?: boolean;
  deviceClass?: "mobile" | "desktop" | "unknown";
};

export const createOperationId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const isOfflineMutationKey = (mutationKey: readonly unknown[] | undefined) =>
  mutationKey?.[0] === OFFLINE_MUTATION_ROOT[0];
