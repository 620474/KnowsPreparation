import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export const QUESTION_STATUSES = ["new", "learning", "review", "mastered"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export type QuestionProgressDocument = HydratedDocument<QuestionProgress>;

@Schema({ timestamps: true, versionKey: false })
export class QuestionProgress {
  @Prop({ required: true, unique: true, index: true })
  questionId!: string;

  @Prop({ required: true, enum: QUESTION_STATUSES, default: "new" })
  status!: QuestionStatus;

  @Prop({ required: true, default: "" })
  note!: string;
}

export const QuestionProgressSchema = SchemaFactory.createForClass(QuestionProgress);
