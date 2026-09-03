import { createHash, randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { interviewReplayV1Schema, interviewTimelineEventV1Schema, type InterviewTimelineEventType } from "@prep/contracts";
import type { Model } from "mongoose";

import { InterviewTimelineEventEntry } from "./schemas/interview-timeline-event.schema";

interface AppendTimelineEvent {
  interviewId: string;
  operationId: string;
  eventType: InterviewTimelineEventType;
  stage: "platform" | "coding" | "ai" | "defense" | "completed";
  title: string;
  content?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

@Injectable()
export class InterviewTimelineV10Service {
  constructor(@InjectModel(InterviewTimelineEventEntry.name) private readonly events: Model<InterviewTimelineEventEntry>) {}

  async append(input: AppendTimelineEvent) {
    const existing = await this.events.findOne({ interviewId: input.interviewId, operationId: input.operationId }).lean().exec();
    if (existing) return this.serialize(existing);
    const latest = await this.events.findOne({ interviewId: input.interviewId }).sort({ sequence: -1 }).lean().exec();
    const occurredAt = input.occurredAt ?? new Date();
    const event = interviewTimelineEventV1Schema.parse({
      eventId: createHash("sha256").update(`${input.interviewId}:${input.operationId}`).digest("hex").slice(0, 32) || randomUUID(),
      interviewId: input.interviewId,
      operationId: input.operationId,
      sequence: (latest?.sequence ?? -1) + 1,
      eventType: input.eventType,
      stage: input.stage,
      title: input.title,
      content: input.content ?? "",
      metadata: input.metadata ?? {},
      occurredAt: occurredAt.toISOString(),
    });
    try {
      const created = await this.events.create({ ...event, occurredAt });
      return this.serialize(created.toObject());
    } catch (cause) {
      const duplicate = await this.events.findOne({ interviewId: input.interviewId, operationId: input.operationId }).lean().exec();
      if (!duplicate) throw cause;
      return this.serialize(duplicate);
    }
  }

  async replay(interviewId: string) {
    const rows = await this.events.find({ interviewId }).sort({ sequence: 1 }).lean().exec();
    return interviewReplayV1Schema.parse({ interviewId, events: rows.map((row) => this.serialize(row)) });
  }

  private serialize(row: InterviewTimelineEventEntry) {
    return interviewTimelineEventV1Schema.parse({
      ...row,
      content: row.content ?? "",
      metadata: row.metadata ?? {},
      occurredAt: new Date(row.occurredAt).toISOString(),
    });
  }
}
