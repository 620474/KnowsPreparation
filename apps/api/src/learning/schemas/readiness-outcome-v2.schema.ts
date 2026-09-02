import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ReadinessOutcomeV2Document = HydratedDocument<ReadinessOutcomeV2Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "readiness_outcomes_v2" })
export class ReadinessOutcomeV2Entry {
  @Prop({ required: true, unique: true, index: true })
  outcomeId!: string;

  @Prop({ required: true, unique: true, index: true })
  snapshotId!: string;

  @Prop({ required: true, index: true })
  targetId!: string;

  @Prop({ type: String, default: null })
  company!: string | null;

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

export const ReadinessOutcomeV2EntrySchema = SchemaFactory.createForClass(ReadinessOutcomeV2Entry);
