import { z } from "zod";

import {
  SKILL_ONTOLOGY_VERSION,
  skillCapabilitySchema,
  skillTransferLevelSchema,
} from "./skills";

export const evidenceSourceKindSchema = z.enum([
  "question_review",
  "question_attempt",
  "quiz_attempt",
  "practice_attempt",
  "mock_interview",
  "interview_session",
  "transfer_assessment",
]);

export const evidenceAssistanceModeSchema = z.enum([
  "no_ai",
  "ai_assisted",
  "normal",
  "unknown",
]);

export const evidenceEvaluatorTypeSchema = z.enum([
  "deterministic",
  "ai",
  "mixed",
]);

export const evidenceObservationSchema = z.object({
  skillId: z.string().min(1),
  capability: skillCapabilitySchema,
  score: z.number().min(0).max(100),
  reliability: z.number().min(0).max(1),
});

export const evidenceSourceSchema = z.object({
  kind: evidenceSourceKindSchema,
  entityId: z.string().min(1),
  itemId: z.string().nullable(),
  itemVersion: z.string(),
  itemFamilyId: z.string().min(1),
  track: z.string().nullable(),
});

export const evidenceAssistanceSchema = z.object({
  mode: evidenceAssistanceModeSchema,
  hintCount: z.number().int().min(0),
  solutionViewed: z.boolean(),
});

export const evidenceEvaluatorSchema = z.object({
  type: evidenceEvaluatorTypeSchema,
  evaluatorVersion: z.string().min(1),
  model: z.string().nullable(),
  promptVersion: z.string().nullable(),
  schemaVersion: z.string().nullable(),
});

export const evidenceEventSchema = z.object({
  eventId: z.string().min(1),
  operationId: z.string().min(1),
  ontologyVersion: z.literal(SKILL_ONTOLOGY_VERSION),
  source: evidenceSourceSchema,
  observations: z.array(evidenceObservationSchema).min(1),
  transferLevel: skillTransferLevelSchema,
  assistance: evidenceAssistanceSchema,
  evaluator: evidenceEvaluatorSchema,
  occurredAt: z.string(),
});

export type EvidenceSourceKind = z.infer<typeof evidenceSourceKindSchema>;
export type EvidenceAssistanceMode = z.infer<typeof evidenceAssistanceModeSchema>;
export type EvidenceEvaluatorType = z.infer<typeof evidenceEvaluatorTypeSchema>;
export type EvidenceObservation = z.infer<typeof evidenceObservationSchema>;
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type EvidenceAssistance = z.infer<typeof evidenceAssistanceSchema>;
export type EvidenceEvaluator = z.infer<typeof evidenceEvaluatorSchema>;
export type EvidenceEvent = z.infer<typeof evidenceEventSchema>;
