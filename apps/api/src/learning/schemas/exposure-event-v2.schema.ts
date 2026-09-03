import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { ExposureEventType } from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

export type ExposureEventV2Document = HydratedDocument<ExposureEventV2Entry>;

@Schema({ timestamps: false, versionKey: false, collection: "exposure_events_v2" })
export class ExposureEventV2Entry {
  @Prop({ required: true, unique: true, index: true }) eventId!: string;
  @Prop({ required: true, index: true }) operationId!: string;
  @Prop({ required: true, default: "2" }) schemaVersion!: "2";
  @Prop({ required: true, index: true }) targetId!: string;
  @Prop({ required: true, index: true }) sessionId!: string;
  @Prop({ required: true, index: true }) itemId!: string;
  @Prop({ type: String, default: null }) leaseId!: string | null;
  @Prop({ type: String, required: true, enum: ["viewed", "attempted", "answer_revealed"], index: true }) eventType!: ExposureEventType;
  @Prop({ required: true }) conceptFamilyId!: string;
  @Prop({ required: true }) formFamilyId!: string;
  @Prop({ required: true }) contextFamilyId!: string;
  @Prop({ required: true }) contentHash!: string;
  @Prop({ type: Date, required: true, index: true }) occurredAt!: Date;
}

export const ExposureEventV2EntrySchema = SchemaFactory.createForClass(ExposureEventV2Entry);
ExposureEventV2EntrySchema.index({ targetId: 1, operationId: 1, eventType: 1 }, { unique: true });
ExposureEventV2EntrySchema.index({ targetId: 1, itemId: 1, occurredAt: -1 });
