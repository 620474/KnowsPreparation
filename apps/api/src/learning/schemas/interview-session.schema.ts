import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type {
  InterviewExercise,
  InterviewSessionCompany,
  InterviewSessionEvaluation,
  InterviewSessionMessage,
  InterviewSessionMode,
  InterviewSessionQuestion,
  InterviewSessionStage,
  InterviewSessionStatus,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export const INTERVIEW_SESSION_MODES = ["express", "full"] as const;
export const INTERVIEW_SESSION_COMPANIES = ["general", "yandex", "ozon"] as const;
export const INTERVIEW_SESSION_STATUSES = [
  "in_progress",
  "evaluating",
  "completed",
] as const;
export const INTERVIEW_SESSION_STAGES = [
  "platform",
  "coding",
  "ai",
  "defense",
  "completed",
] as const;

export type InterviewSessionDocument = HydratedDocument<InterviewSession>;

@Schema({ timestamps: true, versionKey: false })
export class InterviewSession {
  @Prop({ type: String, enum: INTERVIEW_SESSION_STATUSES, default: "in_progress" })
  status!: InterviewSessionStatus;

  @Prop({ type: String, required: true, enum: INTERVIEW_SESSION_MODES })
  mode!: InterviewSessionMode;

  @Prop({ type: String, required: true, enum: INTERVIEW_SESSION_COMPANIES })
  company!: InterviewSessionCompany;

  @Prop({ type: String, default: null })
  applicationId!: string | null;

  @Prop({ default: "" })
  vacancyContext!: string;

  @Prop({ type: String, enum: INTERVIEW_SESSION_STAGES, default: "platform" })
  currentStage!: InterviewSessionStage;

  @Prop({ required: true })
  durationMinutes!: number;

  @Prop({ type: Date, required: true })
  startedAt!: Date;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true, default: [] })
  platformItems!: InterviewSessionQuestion[];

  @Prop({ required: true, default: 2 })
  platformQuestionTarget!: number;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  codingExercise!: InterviewExercise;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  aiExercise!: InterviewExercise;

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true, default: [] })
  aiMessages!: InterviewSessionMessage[];

  @Prop({ type: [String], required: true, default: [] })
  defenseQuestions!: string[];

  @Prop({ type: [String], required: true, default: [] })
  defenseAnswers!: string[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  evaluation!: InterviewSessionEvaluation | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const InterviewSessionSchema = SchemaFactory.createForClass(InterviewSession);
InterviewSessionSchema.index({ status: 1, updatedAt: -1 });
InterviewSessionSchema.index({ completedAt: -1 });
