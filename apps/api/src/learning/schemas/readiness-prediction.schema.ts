import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { InterviewSessionCompany } from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

export type ReadinessPredictionDocument = HydratedDocument<ReadinessPredictionEntry>;

@Schema({ timestamps: true, versionKey: false })
export class ReadinessPredictionEntry {
  @Prop({ required: true, unique: true, index: true })
  snapshotId!: string;

  @Prop({ type: String, required: true, enum: ["general", "yandex", "ozon"], index: true })
  targetId!: InterviewSessionCompany;

  @Prop({ type: String, default: null, index: true })
  applicationId!: string | null;

  @Prop({ type: String, default: null, index: true })
  interviewSessionId!: string | null;

  @Prop({ required: true })
  readinessIndex!: number;

  @Prop({ required: true })
  lower!: number;

  @Prop({ required: true })
  upper!: number;

  @Prop({ required: true })
  coverage!: number;

  @Prop({ required: true })
  transferCoverage!: number;

  @Prop({ type: Number, default: null })
  forecastProbability!: number | null;

  @Prop({ type: String, required: true, enum: ["uncalibrated", "provisional", "calibrated"] })
  calibrationStatus!: "uncalibrated" | "provisional" | "calibrated";

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReadinessPredictionEntrySchema = SchemaFactory.createForClass(ReadinessPredictionEntry);
ReadinessPredictionEntrySchema.index({ targetId: 1, createdAt: -1 });
