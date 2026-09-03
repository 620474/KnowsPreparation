import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type InterviewOutcomeV3Document = HydratedDocument<InterviewOutcomeV3Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "interview_outcomes_v3" })
export class InterviewOutcomeV3Entry {
  @Prop({ required: true, unique: true, index: true }) outcomeId!: string;
  @Prop({ required: true, unique: true, index: true }) operationId!: string;
  @Prop({ required: true, index: true }) snapshotId!: string;
  @Prop({ required: true, index: true }) targetId!: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], required: true }) sections!: Array<Record<string, unknown>>;
  @Prop({ default: "" }) notes!: string;
  @Prop({ type: Date, required: true }) occurredAt!: Date;
}

export const InterviewOutcomeV3EntrySchema = SchemaFactory.createForClass(InterviewOutcomeV3Entry);
