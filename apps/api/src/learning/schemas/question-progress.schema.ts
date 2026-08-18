import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export const QUESTION_STATUSES = ["new", "learning", "review", "mastered"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];
export type QuestionProgressDocument = HydratedDocument<QuestionProgress>;

@Schema({ timestamps: true, versionKey: false })
export class QuestionProgress {
  @Prop({ required: true, unique: true, index: true })
  questionId!: string;

  @Prop({ type: String, required: true, enum: QUESTION_STATUSES, default: "new" })
  status!: QuestionStatus;

  @Prop({ default: "" })
  note!: string;

  @Prop({ required: true, default: 2.5, min: 1.3 })
  easeFactor!: number;

  @Prop({ required: true, default: 0, min: 0 })
  intervalDays!: number;

  @Prop({ required: true, default: 0, min: 0 })
  repetitions!: number;

  @Prop({ type: Date, default: null })
  nextReviewAt!: Date | null;

  @Prop({ type: Date, default: null })
  lastReviewedAt!: Date | null;

  @Prop({ required: true, default: 0, min: 0 })
  reviewCount!: number;

  @Prop({ required: true, default: 0, min: 0 })
  lapseCount!: number;

  @Prop({ type: String, enum: REVIEW_RATINGS, default: null })
  lastRating!: ReviewRating | null;

  @Prop({ type: String, default: null })
  lastReviewOperationId!: string | null;
}

export const QuestionProgressSchema = SchemaFactory.createForClass(QuestionProgress);
