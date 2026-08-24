import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type {
  YandexMockDayId,
  YandexMockStatus,
  YandexMockVerdict,
} from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

@Schema({ _id: false, versionKey: false })
export class YandexPlatformMockAnswer {
  @Prop({ required: true })
  questionId!: string;

  @Prop({ type: String, default: "" })
  response!: string;

  @Prop({ type: String, enum: ["correct", "incorrect"], default: null })
  verdict!: YandexMockVerdict | null;
}

export const YandexPlatformMockAnswerSchema = SchemaFactory.createForClass(
  YandexPlatformMockAnswer,
);

export type YandexPlatformMockAttemptDocument =
  HydratedDocument<YandexPlatformMockAttempt>;

@Schema({ timestamps: true, versionKey: false })
export class YandexPlatformMockAttempt {
  @Prop({
    type: String,
    enum: ["yandex-d07", "yandex-d14", "yandex-d21"],
    required: true,
  })
  dayId!: YandexMockDayId;

  @Prop({ type: String, enum: ["in_progress", "completed"], default: "in_progress" })
  status!: YandexMockStatus;

  @Prop({ type: [String], required: true })
  questionIds!: string[];

  @Prop({ type: [YandexPlatformMockAnswerSchema], required: true, default: [] })
  answers!: YandexPlatformMockAnswer[];

  @Prop({ required: true, default: 60 })
  durationMinutes!: number;

  @Prop({ type: Date, required: true })
  startedAt!: Date;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  score!: number | null;
}

export const YandexPlatformMockAttemptSchema = SchemaFactory.createForClass(
  YandexPlatformMockAttempt,
);
YandexPlatformMockAttemptSchema.index({ dayId: 1, status: 1, updatedAt: -1 });
YandexPlatformMockAttemptSchema.index({ completedAt: -1 });
