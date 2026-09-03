import { z } from "zod";

import { skillCapabilityV3Schema } from "./evidence-v3";

export const ASSESSMENT_EVENT_V4_VERSION = "4" as const;
export const READINESS_V9_VERSION = "verified-transfer-v2" as const;

export const assessmentKindSchema = z.enum([
  "recall", "comprehension", "predict_output", "debugging", "live_coding",
  "refactoring", "system_design", "architecture_defense", "transfer",
]);

export const assessmentNoveltySchema = z.enum(["known_context", "near_transfer", "far_transfer"]);

export const verificationEligibilitySchema = z.enum([
  "eligible", "assisted", "exposed", "repeated", "legacy", "integrity_failed", "incomplete",
]);

export const assessmentEventV4Schema = z.object({
  eventId: z.string().min(1),
  operationId: z.string().min(1),
  schemaVersion: z.literal(ASSESSMENT_EVENT_V4_VERSION),
  targetId: z.string().min(1),
  sessionId: z.string().min(1),
  mode: z.enum(["practice", "diagnostic", "checkpoint", "mock_interview", "real_interview_import"]),
  verificationEligibility: verificationEligibilitySchema,
  itemRef: z.object({
    itemId: z.string().min(1),
    familyId: z.string().min(1),
    conceptFamilyId: z.string().min(1).default("legacy"),
    formFamilyId: z.string().min(1).default("legacy"),
    formId: z.string().min(1),
    contextFamilyId: z.string().min(1),
    contentHash: z.string().min(1),
    contentRevision: z.number().int().positive().default(1),
    difficultyBand: z.number().int().min(1).max(5),
    novelty: assessmentNoveltySchema.default("known_context"),
  }),
  conditions: z.object({
    aiAllowed: z.boolean(),
    aiUsed: z.boolean(),
    hintCount: z.number().int().min(0),
    timed: z.boolean(),
    timeLimitMs: z.number().int().positive(),
    deviceClass: z.enum(["mobile", "desktop", "unknown"]),
    leasedAtServer: z.string().nullable().default(null),
    deadlineAtServer: z.string().nullable().default(null),
    receivedAtServer: z.string().nullable().default(null),
  }),
  process: z.object({
    durationMs: z.number().int().min(0),
    runCount: z.number().int().min(0),
    failedTestCount: z.number().int().min(0),
    revisionCount: z.number().int().min(0),
  }),
  selfAssessment: z.object({
    confidenceBefore: z.number().int().min(0).max(100),
    confidenceAfter: z.number().int().min(0).max(100).nullable(),
  }),
  observations: z.array(z.object({
    criterionId: z.string().min(1).default("legacy-score"),
    skillId: z.string().min(1),
    capability: skillCapabilityV3Schema,
    score: z.number().min(0).max(100),
    reliability: z.number().min(0).max(1),
    difficulty: z.number().int().min(1).max(5).default(2),
    rubricVersion: z.string().min(1).default("legacy-v1"),
  })).min(1),
  integrity: z.object({
    valid: z.boolean(),
    reasonCodes: z.array(z.string()),
    networkInterrupted: z.boolean(),
  }),
  evaluator: z.object({
    type: z.enum(["deterministic", "llm", "mixed"]),
    version: z.string().min(1),
    model: z.string().nullable(),
  }),
  provenance: z.object({
    kind: z.enum(["native", "v3_projection"]),
    sourceEventId: z.string().nullable(),
  }),
  occurredAt: z.string(),
});

export const checkpointPublicItemSchema = z.object({
  itemId: z.string(),
  leaseId: z.string().min(1),
  leaseStartedAt: z.string(),
  deadlineAt: z.string().nullable(),
  assessmentKind: assessmentKindSchema,
  category: z.string(),
  prompt: z.string(),
  capabilities: z.array(skillCapabilityV3Schema),
  difficultyBand: z.number().int().min(1).max(5),
  timeLimitMs: z.number().int().positive(),
  exercise: z.object({
    type: z.enum(["predict_output", "multiple_choice", "bug_fix", "live_coding", "explain"]),
    instructions: z.string(),
    code: z.string().nullable(),
    starterCode: z.string().nullable(),
    choices: z.array(z.string()),
    requiresExplanation: z.boolean(),
  }),
});

export const checkpointSessionV1Schema = z.object({
  sessionId: z.string(),
  targetId: z.string(),
  status: z.enum(["active", "completed", "aborted", "expired", "recovery"]),
  revision: z.number().int().min(0).default(0),
  availableMinutes: z.number().int().positive(),
  totalItems: z.number().int().min(0),
  completedItems: z.number().int().min(0),
  currentItem: checkpointPublicItemSchema.nullable(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const checkpointAttemptResultSchema = z.object({
  eventId: z.string(),
  itemId: z.string(),
  passed: z.boolean(),
  score: z.number().int().min(0).max(100),
  submittedAnswer: z.string(),
  submittedExplanation: z.string().nullable(),
  expectedAnswer: z.string().nullable(),
  feedback: z.array(z.string()),
  verificationEligibility: verificationEligibilitySchema,
  confidenceGap: z.number().int().min(-100).max(100),
});

export const verifiedCapabilitySchema = z.object({
  skillId: z.string(),
  capability: skillCapabilityV3Schema,
  status: z.enum(["unknown", "learning", "fragile", "verified", "stale", "blocked"]),
  score: z.number().min(0).max(100).nullable(),
  lower: z.number().min(0).max(100).nullable(),
  upper: z.number().min(0).max(100).nullable(),
  eligibleEvidenceCount: z.number().int().min(0),
  effectiveEvidenceCount: z.number().min(0),
  independentFormCount: z.number().int().min(0),
  independentContextCount: z.number().int().min(0),
  lastVerifiedAt: z.string().nullable(),
  reverifyAfter: z.string().nullable(),
  reasonCodes: z.array(z.string()),
});

export const readinessV9Schema = z.object({
  version: z.literal(READINESS_V9_VERSION),
  targetId: z.string(),
  targetLabel: z.string(),
  generatedAt: z.string(),
  status: z.enum(["not_ready", "uncertain", "ready"]),
  learningMastery: z.number().min(0).max(100),
  verifiedTransferReadiness: z.number().min(0).max(100),
  verifiedCoverage: z.number().min(0).max(100),
  blockers: z.array(z.string()),
  stabilityFlags: z.array(z.enum(["overconfident", "fragile", "memorization_risk", "hint_dependent", "slow_under_pressure", "unstable"])),
  capabilities: z.array(verifiedCapabilitySchema),
  interviewForecast: z.object({
    probability: z.number().nullable(),
    lower: z.number().nullable(),
    upper: z.number().nullable(),
    status: z.enum(["experimental", "directionally_calibrated", "calibrated"]),
    outcomeCount: z.number().int().min(0),
  }),
});

export const decisionPlanV9Schema = z.object({
  targetId: z.string(),
  generatedAt: z.string(),
  sufficientForToday: z.boolean(),
  actions: z.array(z.object({
    actionId: z.string(),
    kind: z.enum(["diagnostic", "learn", "review", "checkpoint", "intervention", "parallel_retest", "transfer", "mock", "stress_exam"]),
    title: z.string(),
    whyNow: z.string(),
    estimatedMinutes: z.number().int().positive(),
    expectedUncertaintyReduction: z.number().min(0).max(100),
    stopIf: z.string(),
  })).max(2),
});

export const interviewOutcomeQuestionV4Schema = z.object({
  topic: z.string().min(1).max(200),
  skillIds: z.array(z.string().min(1)).max(12),
  summary: z.string().min(1).max(2_000),
  selfResult: z.enum(["strong", "partial", "failed", "unknown"]),
});

export const interviewOutcomeV4InputSchema = z.object({
  operationId: z.string().min(1).max(80),
  snapshotId: z.string().min(1).max(80),
  company: z.string().max(200).nullable(),
  role: z.string().max(200).nullable(),
  stage: z.enum(["screening", "technical", "live_coding", "system_design", "final"]),
  result: z.enum(["passed", "failed", "pending", "withdrawn"]),
  questions: z.array(interviewOutcomeQuestionV4Schema).max(30),
  feedback: z.string().max(4_000).nullable(),
  occurredAt: z.string(),
});

export const interviewOutcomeV4Schema = interviewOutcomeV4InputSchema.extend({
  outcomeId: z.string(),
  targetId: z.string(),
});

export type AssessmentEventV4 = z.infer<typeof assessmentEventV4Schema>;
export type CheckpointPublicItem = z.infer<typeof checkpointPublicItemSchema>;
export type CheckpointSessionV1 = z.infer<typeof checkpointSessionV1Schema>;
export type CheckpointAttemptResult = z.infer<typeof checkpointAttemptResultSchema>;
export type ReadinessV9 = z.infer<typeof readinessV9Schema>;
export type DecisionPlanV9 = z.infer<typeof decisionPlanV9Schema>;
export type InterviewOutcomeV4Input = z.infer<typeof interviewOutcomeV4InputSchema>;
export type InterviewOutcomeV4 = z.infer<typeof interviewOutcomeV4Schema>;
