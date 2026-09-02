export const EVALUATOR_REGISTRY = {
  interviewDirector: {
    evaluatorVersion: "interview-director-evaluator-v1",
    promptVersion: "interview-director-prompt-v1",
    schemaVersion: "1",
    maxOutputTokens: 2_000,
  },
  interviewSession: {
    evaluatorVersion: "interview-session-v2",
    promptVersion: "interview-session-evaluation-v1",
    schemaVersion: "2",
    maxOutputTokens: 4_000,
  },
} as const;

export type EvaluatorKey = keyof typeof EVALUATOR_REGISTRY;

export function getEvaluatorDescriptor(key: EvaluatorKey) {
  return EVALUATOR_REGISTRY[key];
}
