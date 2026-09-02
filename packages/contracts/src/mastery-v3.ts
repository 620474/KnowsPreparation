import { z } from "zod";

import { ASSESSMENT_EVENT_V3_VERSION, assessmentEventV3Schema, skillCapabilityV3Schema } from "./evidence-v3";
import { masteryConfidenceSchema } from "./mastery";
import { SKILL_ONTOLOGY_VERSION, skillDefinitionSchema } from "./skills";

export const MASTERY_MODEL_V3_VERSION = "verified-posterior-v3" as const;
export const READINESS_MODEL_V8_VERSION = "verified-readiness-v8" as const;

export const capabilityMasteryV3Schema = z.object({
  capability: skillCapabilityV3Schema,
  required: z.boolean(),
  posteriorMean: z.number().min(0).max(100),
  lower: z.number().min(0).max(100),
  upper: z.number().min(0).max(100),
  alpha: z.number().positive(),
  beta: z.number().positive(),
  evidenceCount: z.number().int().min(0),
  independentFormCount: z.number().int().min(0),
  independentContextCount: z.number().int().min(0),
  noAiEvidenceCount: z.number().int().min(0),
  latestEvidenceAt: z.string().nullable(),
  confidence: masteryConfidenceSchema,
});

export const skillMasteryV3Schema = z.object({
  skillId: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  posteriorMean: z.number().min(0).max(100),
  lower: z.number().min(0).max(100),
  upper: z.number().min(0).max(100),
  coverage: z.number().min(0).max(100),
  requiredCapabilities: z.array(skillCapabilityV3Schema).min(1),
  unknownCapabilities: z.array(skillCapabilityV3Schema),
  capabilities: z.array(capabilityMasteryV3Schema),
});

export const targetRequirementV2Schema = z.object({
  skillId: z.string().min(1),
  capabilities: z.array(skillCapabilityV3Schema).min(1),
  importance: z.number().min(0.1).max(5),
  required: z.boolean(),
  source: z.string().min(1),
});

export const targetProfileV2Schema = z.object({
  targetId: z.string().min(1),
  label: z.string().min(1),
  company: z.string().nullable(),
  role: z.string().nullable(),
  seniority: z.string().nullable(),
  interviewAt: z.string().nullable(),
  vacancyHash: z.string().nullable(),
  requirements: z.array(targetRequirementV2Schema).min(1),
  version: z.literal("2"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const readinessForecastV2Schema = z.object({
  probability: z.number().min(0).max(1).nullable(),
  lower: z.number().min(0).max(1).nullable(),
  upper: z.number().min(0).max(1).nullable(),
  status: z.enum(["insufficient_outcomes", "provisional", "calibrated"]),
  calibratorVersion: z.string().nullable(),
  outcomeCount: z.number().int().min(0),
  brierScore: z.number().min(0).max(1).nullable(),
});

export const verifiedReadinessV8Schema = z.object({
  targetId: z.string().min(1),
  targetLabel: z.string().min(1),
  evidenceReadiness: z.object({
    index: z.number().min(0).max(100),
    lower: z.number().min(0).max(100),
    upper: z.number().min(0).max(100),
    coverage: z.number().min(0).max(100),
  }),
  interviewForecast: readinessForecastV2Schema,
  decision: z.enum(["not_ready", "uncertain", "ready"]),
  blockers: z.array(z.string()),
});

export const knowledgeOverviewV3Schema = z.object({
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  evidenceVersion: z.literal(ASSESSMENT_EVENT_V3_VERSION),
  masteryModelVersion: z.literal(MASTERY_MODEL_V3_VERSION),
  readinessModelVersion: z.literal(READINESS_MODEL_V8_VERSION),
  generatedAt: z.string(),
  target: targetProfileV2Schema,
  readiness: verifiedReadinessV8Schema,
  skills: z.array(skillMasteryV3Schema),
});

export const skillDetailV3Schema = z.object({
  definition: skillDefinitionSchema,
  mastery: skillMasteryV3Schema,
  evidence: z.array(assessmentEventV3Schema),
});

export const nextBestActionV8Schema = z.object({
  actionId: z.string().min(1),
  targetId: z.string().min(1),
  skillId: z.string().min(1),
  capability: skillCapabilityV3Schema,
  kind: z.enum(["diagnostic", "intervention", "parallel_retest", "transfer", "stress_exam"]),
  title: z.string().min(1),
  reason: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  expectedRiskReduction: z.number().min(0).max(100),
  dueAt: z.string().nullable(),
});

export const decisionPlanV8Schema = z.object({
  targetId: z.string().min(1),
  generatedAt: z.string(),
  availableMinutes: z.number().int().positive(),
  readinessDecision: z.enum(["not_ready", "uncertain", "ready"]),
  actions: z.array(nextBestActionV8Schema).max(3),
});

export const readinessSnapshotV2Schema = z.object({
  snapshotId: z.string().min(1),
  targetId: z.string().min(1),
  applicationId: z.string().nullable(),
  frozenAt: z.string(),
  readiness: verifiedReadinessV8Schema,
  modelVersions: z.object({
    ontology: z.string(),
    evidence: z.string(),
    mastery: z.string(),
    readiness: z.string(),
    calibrator: z.string().nullable(),
  }),
});

export const readinessOutcomeV2Schema = z.object({
  outcomeId: z.string().min(1),
  snapshotId: z.string().min(1),
  targetId: z.string().min(1),
  company: z.string().nullable(),
  technicalPassed: z.boolean(),
  codingPassed: z.boolean().nullable(),
  topics: z.array(z.string()),
  notes: z.string(),
  occurredAt: z.string(),
  createdAt: z.string(),
});

export const readinessCalibrationV2Schema = z.object({
  targetId: z.string().min(1),
  forecast: readinessForecastV2Schema,
  snapshots: z.array(readinessSnapshotV2Schema),
  outcomes: z.array(readinessOutcomeV2Schema),
});

export type CapabilityMasteryV3 = z.infer<typeof capabilityMasteryV3Schema>;
export type SkillMasteryV3 = z.infer<typeof skillMasteryV3Schema>;
export type TargetRequirementV2 = z.infer<typeof targetRequirementV2Schema>;
export type TargetProfileV2 = z.infer<typeof targetProfileV2Schema>;
export type ReadinessForecastV2 = z.infer<typeof readinessForecastV2Schema>;
export type VerifiedReadinessV8 = z.infer<typeof verifiedReadinessV8Schema>;
export type KnowledgeOverviewV3 = z.infer<typeof knowledgeOverviewV3Schema>;
export type SkillDetailV3 = z.infer<typeof skillDetailV3Schema>;
export type NextBestActionV8 = z.infer<typeof nextBestActionV8Schema>;
export type DecisionPlanV8 = z.infer<typeof decisionPlanV8Schema>;
export type ReadinessSnapshotV2 = z.infer<typeof readinessSnapshotV2Schema>;
export type ReadinessOutcomeV2 = z.infer<typeof readinessOutcomeV2Schema>;
export type ReadinessCalibrationV2 = z.infer<typeof readinessCalibrationV2Schema>;
