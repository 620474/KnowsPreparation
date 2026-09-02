import { z } from "zod";

export const aiOperationMetricsSchema = z.object({
  operation: z.string().min(1),
  calls: z.number().int().min(0),
  errors: z.number().int().min(0),
  timeouts: z.number().int().min(0),
  fallbackRate: z.number().min(0).max(1),
  averageDurationMs: z.number().min(0),
  p95DurationMs: z.number().min(0),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
});

export const aiObservabilitySummarySchema = z.object({
  generatedAt: z.string(),
  windowDays: z.number().int().positive(),
  totalCalls: z.number().int().min(0),
  operations: z.array(aiOperationMetricsSchema),
});

export type AiOperationMetrics = z.infer<typeof aiOperationMetricsSchema>;
export type AiObservabilitySummary = z.infer<typeof aiObservabilitySummarySchema>;
