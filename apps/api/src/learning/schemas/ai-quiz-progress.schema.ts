import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

@Schema({ _id: false, versionKey: false })
export class AiQuizAnswer {
  @Prop({ required: true })
  questionId!: string;

  @Prop({ required: true, min: 0, max: 3 })
  selectedOptionIndex!: number;

  @Prop({ required: true })
  correct!: boolean;

  @Prop({ required: true })
  topic!: string;
}

export const AiQuizAnswerSchema = SchemaFactory.createForClass(AiQuizAnswer);

@Schema({ _id: false, versionKey: false })
export class AiQuizAttempt {
  @Prop({ type: String, default: null })
  operationId!: string | null;

  @Prop({ required: true, min: 0, max: 10 })
  score!: number;

  @Prop({ type: [AiQuizAnswerSchema], required: true })
  answers!: AiQuizAnswer[];

  @Prop({ type: Date, required: true })
  completedAt!: Date;
}

export const AiQuizAttemptSchema = SchemaFactory.createForClass(AiQuizAttempt);

export type AiQuizProgressDocument = HydratedDocument<AiQuizProgress>;

@Schema({ timestamps: true, versionKey: false })
export class AiQuizProgress {
  @Prop({ required: true, index: true })
  courseKey!: string;

  @Prop({ required: true })
  courseVersion!: number;

  @Prop({ required: true })
  itemId!: string;

  @Prop({ required: true })
  lessonVersion!: number;

  @Prop({ type: [AiQuizAttemptSchema], required: true, default: [] })
  attempts!: AiQuizAttempt[];
}

export const AiQuizProgressSchema = SchemaFactory.createForClass(AiQuizProgress);
AiQuizProgressSchema.index(
  { courseKey: 1, courseVersion: 1, itemId: 1, lessonVersion: 1 },
  { unique: true },
);
