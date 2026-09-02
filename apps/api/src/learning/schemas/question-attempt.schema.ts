import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  SKILL_KEYS,
  type QuestionCapability,
  type QuestionExerciseType,
  type ReviewRating,
  type SkillKey,
} from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

export type QuestionAttemptDocument = HydratedDocument<QuestionAttempt>;

@Schema({ timestamps: true, versionKey: false })
export class QuestionAttempt {
  @Prop({ required: true, index: true })
  questionId!: string;

  @Prop({ type: String, required: true })
  exerciseType!: QuestionExerciseType;

  @Prop({ type: [String], enum: SKILL_KEYS, required: true, default: [] })
  skillKeys!: SkillKey[];

  @Prop({ type: [String], required: true, default: [] })
  capabilities!: QuestionCapability[];

  @Prop({ required: true, maxlength: 50_000 })
  answer!: string;

  @Prop({ default: "", maxlength: 8_000 })
  explanation!: string;

  @Prop({ required: true })
  passed!: boolean;

  @Prop({ required: true, min: 0, max: 100 })
  score!: number;

  @Prop({ type: [String], required: true, default: [] })
  feedback!: string[];

  @Prop({ type: String, default: null })
  expectedAnswer!: string | null;

  @Prop({ required: true, min: 0, max: 100 })
  confidence!: number;

  @Prop({ required: true, min: 0 })
  responseTimeMs!: number;

  @Prop({ type: String, required: true })
  automaticRating!: ReviewRating;

  @Prop({ required: true, unique: true, index: true })
  operationId!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const QuestionAttemptSchema = SchemaFactory.createForClass(QuestionAttempt);
QuestionAttemptSchema.index({ questionId: 1, createdAt: -1 });
