import { z } from "zod";

import {
  evidenceAssistanceSchema,
  evidenceSourceKindSchema,
} from "./evidence";
import { SKILL_ONTOLOGY_VERSION } from "./skills";

export const ASSESSMENT_EVENT_V3_VERSION = "3" as const;

export const skillCapabilityV3Schema = z.enum([
  "recall",
  "explain",
  "apply",
  "debug",
  "code",
  "design",
  "defend",
  "transfer",
  "resilience",
]);

export const assessmentSourceV3Schema = z.object({
  kind: evidenceSourceKindSchema,
  entityId: z.string().min(1),
  taskId: z.string().min(1),
  taskVersion: z.string().min(1),
  conceptFamilyId: z.string().min(1),
  formId: z.string().min(1),
  contextFamilyId: z.string().min(1),
  track: z.string().nullable(),
});

export const assessmentConditionsV3Schema = z.object({
  aiMode: z.enum(["none", "assisted", "unknown"]),
  hintCount: z.number().int().min(0),
  timed: z.boolean(),
  timeLimitMs: z.number().int().positive().nullable(),
});

export const assessmentProcessV3Schema = z.object({
  durationMs: z.number().int().min(0),
  runCount: z.number().int().min(0),
  failedTestCount: z.number().int().min(0),
  revisionCount: z.number().int().min(0),
}).nullable();

export const assessmentObservationV3Schema = z.object({
  criterionId: z.string().min(1),
  skillId: z.string().min(1),
  capability: skillCapabilityV3Schema,
  score: z.number().min(0).max(100),
  difficulty: z.number().int().min(1).max(5),
  reliability: z.number().min(0).max(1),
  rubricVersion: z.string().min(1),
});

export const assessmentEvaluatorV3Schema = z.object({
  type: z.enum(["deterministic", "human", "llm", "mixed"]),
  model: z.string().nullable(),
  evaluatorVersion: z.string().min(1),
  promptVersion: z.string().nullable(),
  schemaVersion: z.string().nullable(),
});

export const assessmentEventV3Schema = z.object({
  eventId: z.string().min(1),
  operationId: z.string().min(1),
  schemaVersion: z.literal(ASSESSMENT_EVENT_V3_VERSION),
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  targetId: z.string().nullable(),
  source: assessmentSourceV3Schema,
  conditions: assessmentConditionsV3Schema,
  process: assessmentProcessV3Schema,
  observations: z.array(assessmentObservationV3Schema).min(1),
  assistance: evidenceAssistanceSchema,
  evaluator: assessmentEvaluatorV3Schema,
  provenance: z.object({
    kind: z.enum(["native", "v2_projection", "legacy_projection"]),
    sourceEventId: z.string().nullable(),
  }),
  occurredAt: z.string(),
});

export type SkillCapabilityV3 = z.infer<typeof skillCapabilityV3Schema>;
export type AssessmentSourceV3 = z.infer<typeof assessmentSourceV3Schema>;
export type AssessmentConditionsV3 = z.infer<typeof assessmentConditionsV3Schema>;
export type AssessmentProcessV3 = z.infer<typeof assessmentProcessV3Schema>;
export type AssessmentObservationV3 = z.infer<typeof assessmentObservationV3Schema>;
export type AssessmentEvaluatorV3 = z.infer<typeof assessmentEvaluatorV3Schema>;
export type AssessmentEventV3 = z.infer<typeof assessmentEventV3Schema>;
