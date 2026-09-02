import { z } from "zod";

import {
  evidenceAssistanceSchema,
  evidenceEvaluatorSchema,
  evidenceSourceSchema,
} from "./evidence";
import {
  SKILL_ONTOLOGY_VERSION,
  skillCapabilitySchema,
  skillTransferLevelSchema,
} from "./skills";

export const ASSESSMENT_RESULT_VERSION = "2" as const;
export const EVIDENCE_EVENT_VERSION = "2" as const;

export const assessmentObservationV2Schema = z.object({
  criterionId: z.string().min(1),
  rubricVersion: z.string().min(1),
  skillId: z.string().min(1),
  capability: skillCapabilitySchema,
  score: z.number().min(0).max(100),
  reliability: z.number().min(0).max(1),
  weight: z.number().positive().default(1),
});

export const assessmentResultV2Schema = z.object({
  assessmentResultId: z.string().min(1),
  operationId: z.string().min(1),
  schemaVersion: z.literal(ASSESSMENT_RESULT_VERSION),
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  source: evidenceSourceSchema,
  observations: z.array(assessmentObservationV2Schema).min(1),
  transferLevel: skillTransferLevelSchema,
  assistance: evidenceAssistanceSchema,
  evaluator: evidenceEvaluatorSchema,
  occurredAt: z.string(),
});

export const evidenceProvenanceV2Schema = z.object({
  kind: z.enum(["native", "legacy_projection"]),
  sourceEventId: z.string().nullable(),
});

export const evidenceEventV2Schema = assessmentResultV2Schema.extend({
  eventId: z.string().min(1),
  evidenceVersion: z.literal(EVIDENCE_EVENT_VERSION),
  assessmentResultId: z.string().nullable(),
  provenance: evidenceProvenanceV2Schema,
}).omit({ schemaVersion: true });

export type AssessmentObservationV2 = z.infer<typeof assessmentObservationV2Schema>;
export type AssessmentResultV2 = z.infer<typeof assessmentResultV2Schema>;
export type EvidenceProvenanceV2 = z.infer<typeof evidenceProvenanceV2Schema>;
export type EvidenceEventV2 = z.infer<typeof evidenceEventV2Schema>;
