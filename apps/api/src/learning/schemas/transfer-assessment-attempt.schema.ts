import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TransferAssessmentAttemptDocument = HydratedDocument<TransferAssessmentAttempt>;

@Schema({ timestamps: true, versionKey: false, collection: "transfer_assessment_attempts" })
export class TransferAssessmentAttempt {
  @Prop({ required: true, unique: true, index: true })
  attemptId!: string;

  @Prop({ required: true, unique: true, index: true })
  operationId!: string;

  @Prop({ required: true, index: true })
  missionId!: string;

  @Prop({ required: true })
  itemId!: string;

  @Prop({ required: true, maxlength: 20_000 })
  answer!: string;

  @Prop({ required: true, min: 0, max: 100 })
  score!: number;

  @Prop({ required: true })
  passed!: boolean;

  @Prop({ type: [String], required: true, default: [] })
  feedback!: string[];

  @Prop({ required: true, min: 0, max: 100 })
  confidence!: number;

  @Prop({ required: true, min: 0 })
  responseTimeMs!: number;

  @Prop({ type: String, default: null })
  evidenceEventId!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const TransferAssessmentAttemptSchema = SchemaFactory.createForClass(TransferAssessmentAttempt);
TransferAssessmentAttemptSchema.index({ missionId: 1, createdAt: -1 });

