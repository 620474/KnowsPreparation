import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type InterviewOutcomeV3Document = HydratedDocument<InterviewOutcomeV3Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "interview_outcomes_v3" })
export class InterviewOutcomeV3Entry {
  @Prop({ required: true, unique: true, index: true }) outcomeId!: string;
  @Prop({ required: true, unique: true, index: true }) operationId!: string;
  @Prop({ required: true, index: true }) snapshotId!: string;
  @Prop({ required: true, index: true }) targetId!: string;
  @Prop({ type: String, default: null }) company!: string | null;
  @Prop({ type: String, default: null }) role!: string | null;
  @Prop({ type: String, required: true, default: "technical", enum: ["screening", "technical", "live_coding", "system_design", "final"] }) stage!: string;
  @Prop({ type: String, required: true, default: "pending", enum: ["passed", "failed", "pending", "withdrawn"] }) result!: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) questions!: Array<Record<string, unknown>>;
  @Prop({ type: String, default: null }) feedback!: string | null;
  @Prop({ type: Date, required: true }) occurredAt!: Date;
}

export const InterviewOutcomeV3EntrySchema = SchemaFactory.createForClass(InterviewOutcomeV3Entry);
InterviewOutcomeV3EntrySchema.index({ targetId: 1, occurredAt: -1 });
