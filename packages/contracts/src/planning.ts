import { z } from "zod";

export const adaptiveReasonCodeSchema = z.enum([
  "TARGET_GAP",
  "STALE_EVIDENCE",
  "INSUFFICIENT_EVIDENCE",
  "TRANSFER_MISSING",
  "REVIEW_DUE",
  "FAILED_PRACTICE",
  "UPCOMING_INTERVIEW",
  "NEXT_CURRICULUM_STEP",
  "CROSS_TRACK_COVERAGE",
]);

export const v6PlanningMetadataSchema = z.object({
  targetedSkillIds: z.array(z.string()),
  reasonCodes: z.array(adaptiveReasonCodeSchema),
  expectedLearningGain: z.number().min(0).max(100),
  expectedInformationGain: z.number().min(0).max(100),
  crossTrack: z.object({
    mode: z.enum(["partial", "verify"]),
    coveredSkillIds: z.array(z.string()),
    sourceTracks: z.array(z.string()),
  }).optional(),
});

export type AdaptiveReasonCode = z.infer<typeof adaptiveReasonCodeSchema>;
export type V6PlanningMetadata = z.infer<typeof v6PlanningMetadataSchema>;
