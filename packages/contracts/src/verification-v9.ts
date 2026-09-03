import { z } from "zod";

import { skillCapabilityV3Schema } from "./evidence-v3";

export const ASSESSMENT_EVENT_V4_VERSION = "4" as const;
export const READINESS_V9_VERSION = "verified-transfer-v1" as const;

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
    formId: z.string().min(1),
    contextFamilyId: z.string().min(1),
    contentHash: z.string().min(1),
    difficultyBand: z.number().int().min(1).max(5),
  }),
  conditions: z.object({
    aiAllowed: z.boolean(),
    aiUsed: z.boolean(),
    hintCount: z.number().int().min(0),
    timed: z.boolean(),
    timeLimitMs: z.number().int().positive(),
    deviceClass: z.enum(["mobile", "desktop", "unknown"]),
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
    skillId: z.string().min(1),
    capability: skillCapabilityV3Schema,
    score: z.number().min(0).max(100),
    reliability: z.number().min(0).max(1),
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
  familyId: z.string(),
  formId: z.string(),
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
  status: z.enum(["active", "completed", "aborted"]),
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
  status: z.enum(["insufficient", "fragile", "verified"]),
  score: z.number().min(0).max(100).nullable(),
  eligibleEvidenceCount: z.number().int().min(0),
  independentFormCount: z.number().int().min(0),
  lastVerifiedAt: z.string().nullable(),
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
    kind: z.enum(["diagnostic", "checkpoint", "intervention", "parallel_retest", "transfer", "stress_exam"]),
    title: z.string(),
    whyNow: z.string(),
    estimatedMinutes: z.number().int().positive(),
    expectedUncertaintyReduction: z.number().min(0).max(100),
    stopIf: z.string(),
  })).max(2),
});

export type AssessmentEventV4 = z.infer<typeof assessmentEventV4Schema>;
export type CheckpointPublicItem = z.infer<typeof checkpointPublicItemSchema>;
export type CheckpointSessionV1 = z.infer<typeof checkpointSessionV1Schema>;
export type CheckpointAttemptResult = z.infer<typeof checkpointAttemptResultSchema>;
export type ReadinessV9 = z.infer<typeof readinessV9Schema>;
export type DecisionPlanV9 = z.infer<typeof decisionPlanV9Schema>;
