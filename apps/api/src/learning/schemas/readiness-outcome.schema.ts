import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { InterviewSessionCompany } from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

export type ReadinessOutcomeDocument = HydratedDocument<ReadinessOutcomeEntry>;

@Schema({ timestamps: true, versionKey: false })
export class ReadinessOutcomeEntry {
  @Prop({ required: true, unique: true, index: true })
  outcomeId!: string;

  @Prop({ required: true, unique: true, index: true })
  predictionSnapshotId!: string;

  @Prop({ type: String, default: null, index: true })
  applicationId!: string | null;

  @Prop({ type: String, required: true, enum: ["general", "yandex", "ozon"] })
  company!: InterviewSessionCompany;

  @Prop({ required: true })
  technicalPassed!: boolean;

  @Prop({ type: Boolean, default: null })
  codingPassed!: boolean | null;

  @Prop({ type: [String], default: [] })
  topics!: string[];

  @Prop({ default: "" })
  notes!: string;

  @Prop({ type: Date, required: true, index: true })
  occurredAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReadinessOutcomeEntrySchema = SchemaFactory.createForClass(ReadinessOutcomeEntry);
