import { z } from "zod";

import { verifiedCapabilitySchema } from "./verification-v9";

export const EXPOSURE_EVENT_V2_VERSION = "2" as const;
export const CANDIDATE_STATE_V1_VERSION = "candidate-state-v1" as const;

export const exposureEventTypeSchema = z.enum(["viewed", "attempted", "answer_revealed"]);

export const exposureEventV2Schema = z.object({
  eventId: z.string().min(1),
  operationId: z.string().min(1),
  schemaVersion: z.literal(EXPOSURE_EVENT_V2_VERSION),
  targetId: z.string().min(1),
  sessionId: z.string().min(1),
  itemId: z.string().min(1),
  leaseId: z.string().nullable(),
  eventType: exposureEventTypeSchema,
  conceptFamilyId: z.string().min(1),
  formFamilyId: z.string().min(1),
  contextFamilyId: z.string().min(1),
  contentHash: z.string().min(1),
  occurredAt: z.string(),
});

export const candidateStateV1Schema = z.object({
  version: z.literal(CANDIDATE_STATE_V1_VERSION),
  targetId: z.string().min(1),
  targetLabel: z.string().min(1),
  generatedAt: z.string(),
  readiness: z.object({
    status: z.enum(["not_ready", "uncertain", "ready"]),
    learningMastery: z.number().min(0).max(100),
    verifiedTransferReadiness: z.number().min(0).max(100),
    verifiedCoverage: z.number().min(0).max(100),
    blockers: z.array(z.string()),
    capabilities: z.array(verifiedCapabilitySchema),
  }),
  evidence: z.object({
    totalAssessments: z.number().int().min(0),
    eligibleAssessments: z.number().int().min(0),
    validAssessments: z.number().int().min(0),
    latestAssessmentAt: z.string().nullable(),
  }),
  exposure: z.object({
    totalEvents: z.number().int().min(0),
    uniqueItemsViewed: z.number().int().min(0),
    attempts: z.number().int().min(0),
    answersRevealed: z.number().int().min(0),
    repeatedItemCount: z.number().int().min(0),
    latestExposureAt: z.string().nullable(),
  }),
  behavior: z.object({
    averageConfidenceGap: z.number().nullable(),
    averageDurationMs: z.number().nullable(),
    averageRevisionCount: z.number().nullable(),
    interruptedAssessmentCount: z.number().int().min(0),
  }),
});

export type ExposureEventV2 = z.infer<typeof exposureEventV2Schema>;
export type ExposureEventType = z.infer<typeof exposureEventTypeSchema>;
export type CandidateStateV1 = z.infer<typeof candidateStateV1Schema>;
