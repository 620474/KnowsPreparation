import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AiPracticeProgressDocument = HydratedDocument<AiPracticeProgress>;

@Schema({ timestamps: true, versionKey: false })
export class AiPracticeProgress {
  @Prop({ required: true, index: true })
  courseKey!: string;

  @Prop({ required: true })
  courseVersion!: number;

  @Prop({ required: true })
  itemId!: string;

  @Prop({ required: true })
  lessonVersion!: number;

  // `required` несовместим с пустой строкой: Mongoose считает "" отсутствующим
  // значением, поэтому очистка решения приводила к ошибке валидации.
  @Prop({ type: String, default: "" })
  solution!: string;

  @Prop({ required: true, default: 0, min: 0 })
  revision!: number;

  @Prop({ type: String, default: null })
  lastOperationId!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AiPracticeProgressSchema = SchemaFactory.createForClass(AiPracticeProgress);
AiPracticeProgressSchema.index(
  { courseKey: 1, courseVersion: 1, itemId: 1, lessonVersion: 1 },
  { unique: true },
);
