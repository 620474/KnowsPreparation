import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { SKILL_KEYS, TRACK_KEYS, type SkillKey, type TrackKey } from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export const LEARNING_SIGNAL_TYPES = [
  "question_reviewed",
  "question_attempted",
  "quiz_submitted",
  "practice_attempted",
  "mock_completed",
  "recommendation_skipped",
] as const;
export type LearningSignalType = (typeof LEARNING_SIGNAL_TYPES)[number];
export type LearningSignalDocument = HydratedDocument<LearningSignal>;

@Schema({ timestamps: true, versionKey: false })
export class LearningSignal {
  @Prop({ type: String, required: true, enum: LEARNING_SIGNAL_TYPES, index: true })
  type!: LearningSignalType;

  @Prop({ type: String, enum: TRACK_KEYS, default: null })
  track!: TrackKey | null;

  @Prop({ type: String, default: null, index: true })
  itemId!: string | null;

  @Prop({ type: [String], enum: SKILL_KEYS, required: true, default: [] })
  skillKeys!: SkillKey[];

  @Prop({ type: MongooseSchema.Types.Mixed, required: true, default: {} })
  payload!: Record<string, unknown>;

  @Prop({ required: true, unique: true, index: true })
  operationId!: string;

  @Prop({ type: Date, required: true, index: true })
  occurredAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const LearningSignalSchema = SchemaFactory.createForClass(LearningSignal);
LearningSignalSchema.index({ occurredAt: -1, type: 1 });
