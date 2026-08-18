import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export const MOCK_INTERVIEW_STATUSES = ["in_progress", "completed"] as const;
export type MockInterviewStatus = (typeof MOCK_INTERVIEW_STATUSES)[number];

@Schema({ _id: false, versionKey: false })
export class MockInterviewAnswer {
  @Prop({ required: true })
  questionId!: string;

  // Ответ из одних пробелов после trim становится "", а `required` отклоняет
  // пустую строку и роняет сохранение интервью.
  @Prop({ type: String, default: "" })
  content!: string;
}

export const MockInterviewAnswerSchema = SchemaFactory.createForClass(MockInterviewAnswer);

@Schema({ _id: false, versionKey: false })
export class MockQuestionEvaluation {
  @Prop({ required: true })
  questionId!: string;

  @Prop({ required: true, min: 0, max: 5 })
  score!: number;

  @Prop({ required: true })
  feedback!: string;

  @Prop({ type: [String], required: true, default: [] })
  missingPoints!: string[];
}

export const MockQuestionEvaluationSchema = SchemaFactory.createForClass(
  MockQuestionEvaluation,
);

@Schema({ _id: false, versionKey: false })
export class MockInterviewEvaluation {
  @Prop({ required: true, min: 0, max: 100 })
  overallScore!: number;

  @Prop({ required: true })
  summary!: string;

  @Prop({ type: [String], required: true, default: [] })
  strengths!: string[];

  @Prop({ type: [String], required: true, default: [] })
  weakTopics!: string[];

  @Prop({ type: [MockQuestionEvaluationSchema], required: true, default: [] })
  questions!: MockQuestionEvaluation[];
}

export const MockInterviewEvaluationSchema = SchemaFactory.createForClass(
  MockInterviewEvaluation,
);

export type MockInterviewDocument = HydratedDocument<MockInterview>;

@Schema({ timestamps: true, versionKey: false })
export class MockInterview {
  @Prop({
    type: String,
    required: true,
    enum: MOCK_INTERVIEW_STATUSES,
    default: "in_progress",
  })
  status!: MockInterviewStatus;

  @Prop({ type: [String], required: true })
  questionIds!: string[];

  @Prop({ type: [MockInterviewAnswerSchema], required: true, default: [] })
  answers!: MockInterviewAnswer[];

  @Prop({ required: true, default: 20 })
  durationMinutes!: number;

  @Prop({ type: Date, required: true })
  startedAt!: Date;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: MockInterviewEvaluationSchema, default: null })
  evaluation!: MockInterviewEvaluation | null;
}

export const MockInterviewSchema = SchemaFactory.createForClass(MockInterview);
MockInterviewSchema.index({ status: 1, updatedAt: -1 });
