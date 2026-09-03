import { createHash, randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  EXPOSURE_EVENT_V2_VERSION,
  exposureEventV2Schema,
  type ExposureEventType,
} from "@prep/contracts";
import type { Model } from "mongoose";

import type { AssessmentManifestEntry } from "./assessment-manifest";
import { ExposureEventV2Entry } from "./schemas/exposure-event-v2.schema";

interface RecordExposureInput {
  eventType: ExposureEventType;
  operationId: string;
  targetId: string;
  sessionId: string;
  itemId: string;
  leaseId: string | null;
  manifest: AssessmentManifestEntry;
  contentHash: string;
  occurredAt?: Date;
}

@Injectable()
export class EvidenceLedgerV10Service {
  constructor(
    @InjectModel(ExposureEventV2Entry.name) private readonly events: Model<ExposureEventV2Entry>,
  ) {}

  async record(input: RecordExposureInput) {
    const occurredAt = input.occurredAt ?? new Date();
    const event = exposureEventV2Schema.parse({
      eventId: this.eventId(input.targetId, input.operationId, input.eventType),
      operationId: input.operationId,
      schemaVersion: EXPOSURE_EVENT_V2_VERSION,
      targetId: input.targetId,
      sessionId: input.sessionId,
      itemId: input.itemId,
      leaseId: input.leaseId,
      eventType: input.eventType,
      conceptFamilyId: input.manifest.conceptFamilyId,
      formFamilyId: input.manifest.formFamilyId,
      contextFamilyId: input.manifest.contextFamilyId,
      contentHash: input.contentHash,
      occurredAt: occurredAt.toISOString(),
    });
    await this.events.updateOne(
      { targetId: event.targetId, operationId: event.operationId, eventType: event.eventType },
      { $setOnInsert: { ...event, occurredAt } },
      { upsert: true },
    ).exec();
    return event;
  }

  async summarize(targetId: string) {
    const rows = await this.events.find({ targetId }).sort({ occurredAt: 1 }).lean().exec();
    const viewsByItem = new Map<string, number>();
    let attempts = 0;
    let answersRevealed = 0;
    for (const row of rows) {
      if (row.eventType === "viewed") viewsByItem.set(row.itemId, (viewsByItem.get(row.itemId) ?? 0) + 1);
      if (row.eventType === "attempted") attempts += 1;
      if (row.eventType === "answer_revealed") answersRevealed += 1;
    }
    return {
      totalEvents: rows.length,
      uniqueItemsViewed: viewsByItem.size,
      attempts,
      answersRevealed,
      repeatedItemCount: [...viewsByItem.values()].filter((count) => count > 1).length,
      latestExposureAt: rows.at(-1)?.occurredAt ? new Date(rows.at(-1)!.occurredAt).toISOString() : null,
    };
  }

  private eventId(targetId: string, operationId: string, eventType: ExposureEventType) {
    return createHash("sha256").update(`${targetId}:${operationId}:${eventType}`).digest("hex").slice(0, 32) || randomUUID();
  }
}
