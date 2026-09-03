import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { InterviewTimelineEventType } from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type InterviewTimelineEventDocument = HydratedDocument<InterviewTimelineEventEntry>;

@Schema({ timestamps: false, versionKey: false, collection: "interview_timeline_events_v1" })
export class InterviewTimelineEventEntry {
  @Prop({ required: true, unique: true, index: true }) eventId!: string;
  @Prop({ required: true, index: true }) interviewId!: string;
  @Prop({ required: true, index: true }) operationId!: string;
  @Prop({ required: true }) sequence!: number;
  @Prop({ type: String, required: true, index: true }) eventType!: InterviewTimelineEventType;
  @Prop({ type: String, required: true }) stage!: "platform" | "coding" | "ai" | "defense" | "completed";
  @Prop({ required: true }) title!: string;
  @Prop({ type: String, default: "" }) content!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, unknown>;
  @Prop({ type: Date, required: true, index: true }) occurredAt!: Date;
}

export const InterviewTimelineEventEntrySchema = SchemaFactory.createForClass(InterviewTimelineEventEntry);
InterviewTimelineEventEntrySchema.index({ interviewId: 1, sequence: 1 }, { unique: true });
InterviewTimelineEventEntrySchema.index({ interviewId: 1, operationId: 1 }, { unique: true });
