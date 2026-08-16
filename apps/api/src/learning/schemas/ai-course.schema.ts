import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export const AI_LEVELS = ["middle", "middle-plus", "senior"] as const;
export type AiLevel = (typeof AI_LEVELS)[number];

@Schema({ _id: false, versionKey: false })
export class AiCourseItem {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  objective!: string;

  @Prop({ required: true })
  estimatedMinutes!: number;

  @Prop({ type: [String], required: true, default: [] })
  resourceIds!: string[];
}

export const AiCourseItemSchema = SchemaFactory.createForClass(AiCourseItem);

export type AiCourseDocument = HydratedDocument<AiCourse>;

@Schema({ timestamps: true, versionKey: false })
export class AiCourse {
  @Prop({ required: true, unique: true, index: true, default: "main" })
  key!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  summary!: string;

  @Prop({ required: true })
  goal!: string;

  @Prop({ required: true, enum: AI_LEVELS })
  level!: AiLevel;

  @Prop({ required: true })
  deadline!: string;

  @Prop({ required: true })
  dailyMinutes!: number;

  @Prop({ type: [String], required: true, default: [] })
  targetCompanies!: string[];

  @Prop({ type: [String], required: true, default: [] })
  weakTopics!: string[];

  @Prop({ required: true, default: 1 })
  version!: number;

  @Prop({ required: true })
  generatedAt!: string;

  @Prop({ type: [AiCourseItemSchema], required: true, default: [] })
  items!: AiCourseItem[];
}

export const AiCourseSchema = SchemaFactory.createForClass(AiCourse);

@Schema({ _id: false, versionKey: false })
export class AiCodeExample {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  explanation!: string;
}

export const AiCodeExampleSchema = SchemaFactory.createForClass(AiCodeExample);

@Schema({ _id: false, versionKey: false })
export class AiDiagramNode {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  detail!: string;

  @Prop({ required: true })
  row!: number;

  @Prop({ required: true })
  column!: number;
}

export const AiDiagramNodeSchema = SchemaFactory.createForClass(AiDiagramNode);

@Schema({ _id: false, versionKey: false })
export class AiDiagramEdge {
  @Prop({ required: true })
  from!: string;

  @Prop({ required: true })
  to!: string;

  @Prop({ required: true })
  label!: string;
}

export const AiDiagramEdgeSchema = SchemaFactory.createForClass(AiDiagramEdge);

@Schema({ _id: false, versionKey: false })
export class AiDiagram {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [AiDiagramNodeSchema], required: true, default: [] })
  nodes!: AiDiagramNode[];

  @Prop({ type: [AiDiagramEdgeSchema], required: true, default: [] })
  edges!: AiDiagramEdge[];
}

export const AiDiagramSchema = SchemaFactory.createForClass(AiDiagram);

@Schema({ _id: false, versionKey: false })
export class AiPracticeExample {
  @Prop({ required: true })
  input!: string;

  @Prop({ required: true })
  output!: string;

  @Prop({ required: true })
  explanation!: string;
}

export const AiPracticeExampleSchema = SchemaFactory.createForClass(AiPracticeExample);

@Schema({ _id: false, versionKey: false })
export class AiPractice {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  statement!: string;

  @Prop({ type: [String], required: true, default: [] })
  constraints!: string[];

  @Prop({ type: [AiPracticeExampleSchema], required: true, default: [] })
  examples!: AiPracticeExample[];
}

export const AiPracticeSchema = SchemaFactory.createForClass(AiPractice);

export type AiLessonDocument = HydratedDocument<AiLesson>;

@Schema({ timestamps: true, versionKey: false })
export class AiLesson {
  @Prop({ required: true, index: true, default: "main" })
  courseKey!: string;

  @Prop({ required: true })
  courseVersion!: number;

  @Prop({ required: true })
  itemId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ type: [String], required: true, default: [] })
  goals!: string[];

  @Prop({ required: true })
  explanation!: string;

  @Prop({ type: [AiCodeExampleSchema], required: true, default: [] })
  codeExamples!: AiCodeExample[];

  @Prop({ type: [AiDiagramSchema], required: true, default: [] })
  diagrams!: AiDiagram[];

  @Prop({ type: [String], required: true, default: [] })
  commonMistakes!: string[];

  @Prop({ type: [String], required: true, default: [] })
  interviewQuestions!: string[];

  @Prop({ type: AiPracticeSchema, required: true })
  practice!: AiPractice;

  @Prop({ required: true })
  summary!: string;

  @Prop({ type: [String], required: true, default: [] })
  resourceIds!: string[];

  @Prop({ required: true, default: 1 })
  version!: number;

  @Prop({ required: true })
  generatedAt!: string;
}

export const AiLessonSchema = SchemaFactory.createForClass(AiLesson);
AiLessonSchema.index(
  { courseKey: 1, courseVersion: 1, itemId: 1 },
  { unique: true },
);
