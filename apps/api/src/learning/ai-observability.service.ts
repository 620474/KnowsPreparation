import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { aiObservabilitySummarySchema } from "@prep/contracts";
import type { Model } from "mongoose";

import { AiInvocationEntry } from "./schemas/ai-invocation.schema";

const percentile95 = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
};

@Injectable()
export class AiObservabilityService {
  constructor(
    @InjectModel(AiInvocationEntry.name)
    private readonly invocationModel: Model<AiInvocationEntry>,
  ) {}

  async summary(windowDays = 30) {
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const entries = await this.invocationModel
      .find({ occurredAt: { $gte: since } })
      .sort({ occurredAt: -1 })
      .limit(5_000)
      .lean()
      .exec();
    const groups = new Map<string, typeof entries>();
    for (const entry of entries) {
      const group = groups.get(entry.operation) ?? [];
      group.push(entry);
      groups.set(entry.operation, group);
    }
    return aiObservabilitySummarySchema.parse({
      generatedAt: new Date().toISOString(),
      windowDays,
      totalCalls: entries.length,
      operations: [...groups.entries()].map(([operation, items]) => {
        const sumUsage = (keys: string[]) => items.reduce((sum, item) => {
          const value = keys.map((key) => item.usage?.[key])
            .find((candidate) => typeof candidate === "number");
          return sum + (value ?? 0);
        }, 0);
        return {
          operation,
          calls: items.length,
          errors: items.filter((item) => item.status === "error").length,
          timeouts: items.filter((item) => item.status === "timeout").length,
          fallbackRate: items.filter((item) => item.fallbackUsed).length / items.length,
          averageDurationMs: Math.round(
            items.reduce((sum, item) => sum + item.durationMs, 0) / items.length,
          ),
          p95DurationMs: percentile95(items.map((item) => item.durationMs)),
          inputTokens: sumUsage(["input_tokens", "prompt_tokens"]),
          outputTokens: sumUsage(["output_tokens", "completion_tokens"]),
        };
      }).sort((left, right) => right.calls - left.calls),
    });
  }
}
