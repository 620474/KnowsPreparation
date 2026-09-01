import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type {
  ResearchDesign,
  ResearchMilestone,
  ResearchProjectStatus,
  ResearchQualityGate,
  ResearchRisk,
  ResearchStage,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type ResearchProjectDocument = HydratedDocument<ResearchProject>;

@Schema({ timestamps: true, versionKey: false })
export class ResearchProject {
  @Prop({ required: true, unique: true, index: true })
  projectId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: "" })
  decisionStatement!: string;

  @Prop({ default: "" })
  primaryQuestion!: string;

  @Prop({ default: "" })
  scope!: string;

  @Prop({ type: String, required: true })
  design!: ResearchDesign;

  @Prop({ type: String, required: true, index: true })
  status!: ResearchProjectStatus;

  @Prop({ type: String, default: null })
  startDate!: string | null;

  @Prop({ type: String, default: null, index: true })
  targetDate!: string | null;

  @Prop({ default: "" })
  nextAction!: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  stages!: ResearchStage[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  qualityGates!: ResearchQualityGate[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  risks!: ResearchRisk[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  milestones!: ResearchMilestone[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const ResearchProjectSchema = SchemaFactory.createForClass(ResearchProject);
ResearchProjectSchema.index({ status: 1, targetDate: 1, updatedAt: -1 });
