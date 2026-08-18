import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  SKILL_KEYS,
  TRACK_KEYS,
  type PracticeAttemptSource,
  type SkillKey,
  type TrackKey,
} from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

export type PracticeAttemptDocument = HydratedDocument<PracticeAttempt>;

@Schema({ _id: false, versionKey: false })
export class PracticeAttemptTestResult {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  passed!: boolean;

  @Prop({ type: String })
  error?: string;
}

export const PracticeAttemptTestResultSchema = SchemaFactory.createForClass(
  PracticeAttemptTestResult,
);

@Schema({ timestamps: true, versionKey: false })
export class PracticeAttempt {
  @Prop({ type: String, required: true, enum: TRACK_KEYS, index: true })
  track!: TrackKey;

  @Prop({ required: true })
  courseKey!: string;

  @Prop({ required: true })
  courseVersion!: number;

  @Prop({ required: true, index: true })
  itemId!: string;

  @Prop({ type: String, required: true, enum: ["task", "lesson"] })
  source!: PracticeAttemptSource;

  @Prop({ required: true })
  exerciseVersion!: string;

  @Prop({ type: [String], enum: SKILL_KEYS, required: true, default: [] })
  skillKeys!: SkillKey[];

  @Prop({ required: true, maxlength: 50_000 })
  solution!: string;

  @Prop({ required: true })
  passed!: boolean;

  @Prop({ required: true, min: 0 })
  passedCount!: number;

  @Prop({ required: true, min: 0 })
  totalCount!: number;

  @Prop({ required: true, min: 0 })
  durationMs!: number;

  @Prop({ type: String, default: null })
  error!: string | null;

  @Prop({
    type: [PracticeAttemptTestResultSchema],
    required: true,
    default: [],
  })
  tests!: PracticeAttemptTestResult[];

  @Prop({ required: true, unique: true, index: true })
  operationId!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PracticeAttemptSchema = SchemaFactory.createForClass(PracticeAttempt);
PracticeAttemptSchema.index(
  { track: 1, itemId: 1, source: 1, createdAt: -1 },
);
