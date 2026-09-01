import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type {
  CareerInterview,
  CareerPipelineStage,
  CareerPriority,
  CareerVacancyAnalysis,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type CareerApplicationDocument = HydratedDocument<CareerApplicationEntry>;

@Schema({ timestamps: true, versionKey: false })
export class CareerApplicationEntry {
  @Prop({ required: true, unique: true, index: true })
  applicationId!: string;

  @Prop({ required: true, index: true })
  company!: string;

  @Prop({ required: true })
  role!: string;

  @Prop({ default: "" })
  url!: string;

  @Prop({ default: "" })
  source!: string;

  @Prop({ default: "" })
  description!: string;

  @Prop({ type: String, required: true, index: true })
  priority!: CareerPriority;

  @Prop({ type: String, required: true, index: true })
  stage!: CareerPipelineStage;

  @Prop({ type: Number, default: 0 })
  fitScore!: number;

  @Prop({ default: "" })
  salary!: string;

  @Prop({ default: "" })
  workFormat!: string;

  @Prop({ default: "" })
  level!: string;

  @Prop({ type: [String], default: [] })
  stack!: string[];

  @Prop({ default: "" })
  recruiterName!: string;

  @Prop({ default: "" })
  recruiterContact!: string;

  @Prop({ default: "" })
  hiringManagerName!: string;

  @Prop({ default: "" })
  hiringManagerContact!: string;

  @Prop({ type: String, default: null })
  publishedAt!: string | null;

  @Prop({ type: String, default: null, index: true })
  appliedAt!: string | null;

  @Prop({ type: String, default: null, index: true })
  followUpAt!: string | null;

  @Prop({ default: "" })
  nextAction!: string;

  @Prop({ default: "" })
  rejectionReason!: string;

  @Prop({ default: "" })
  notes!: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  interviews!: CareerInterview[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  analysis!: CareerVacancyAnalysis | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CareerApplicationEntrySchema = SchemaFactory.createForClass(
  CareerApplicationEntry,
);
CareerApplicationEntrySchema.index({ stage: 1, priority: 1, updatedAt: -1 });
