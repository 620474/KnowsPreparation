import { z } from "zod";

export const companyProfileSourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().nullable(),
  kind: z.enum([
    "official",
    "vacancy",
    "engineering",
    "candidate_report",
    "community",
    "curated",
  ]),
  reviewedAt: z.string(),
  publishedAt: z.string().optional(),
  interviewAt: z.string().optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
});

export const companyProfileV1Schema = z.object({
  companyId: z.enum(["general", "yandex", "ozon", "avito", "tbank", "mts", "2gis"]),
  label: z.string().min(1),
  summary: z.string().min(1),
  focusAreas: z.array(z.string().min(1)).min(1),
  interviewStages: z.array(z.string().min(1)).min(1),
  confidence: z.enum(["low", "medium", "high"]),
  sources: z.array(companyProfileSourceSchema).min(1),
  version: z.string().min(1),
});

export const interviewTimelineEventTypeSchema = z.enum([
  "session_started", "task_issued", "answer_submitted", "interviewer_action",
  "code_snapshot", "test_run", "ai_message", "stage_changed", "session_completed",
]);

export const interviewTimelineEventV1Schema = z.object({
  eventId: z.string().min(1),
  interviewId: z.string().min(1),
  operationId: z.string().min(1),
  sequence: z.number().int().min(0),
  eventType: interviewTimelineEventTypeSchema,
  stage: z.enum(["platform", "coding", "ai", "defense", "completed"]),
  title: z.string().min(1),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  occurredAt: z.string(),
});

export const interviewReplayV1Schema = z.object({
  interviewId: z.string().min(1),
  events: z.array(interviewTimelineEventV1Schema),
});

export type CompanyProfileV1 = z.infer<typeof companyProfileV1Schema>;
export type InterviewTimelineEventType = z.infer<typeof interviewTimelineEventTypeSchema>;
export type InterviewTimelineEventV1 = z.infer<typeof interviewTimelineEventV1Schema>;
export type InterviewReplayV1 = z.infer<typeof interviewReplayV1Schema>;
