import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  ASSESSMENT_RESULT_VERSION,
  SKILL_ONTOLOGY_VERSION,
  type AssessmentObservationV2,
  type EvidenceAssistance,
  type EvidenceEvaluator,
  type EvidenceSource,
  type SkillTransferLevel,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type AssessmentResultV2Document = HydratedDocument<AssessmentResultV2Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "assessment_results_v2" })
export class AssessmentResultV2Entry {
  @Prop({ required: true, unique: true, index: true })
  assessmentResultId!: string;

  @Prop({ required: true, unique: true, index: true })
  operationId!: string;

  @Prop({ type: String, required: true, default: ASSESSMENT_RESULT_VERSION })
  schemaVersion!: typeof ASSESSMENT_RESULT_VERSION;

  @Prop({ type: String, required: true, default: SKILL_ONTOLOGY_VERSION })
  ontologyVersion!: typeof SKILL_ONTOLOGY_VERSION;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  source!: EvidenceSource;

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true })
  observations!: AssessmentObservationV2[];

  @Prop({ type: String, required: true })
  transferLevel!: SkillTransferLevel;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  assistance!: EvidenceAssistance;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  evaluator!: EvidenceEvaluator;

  @Prop({ type: Date, required: true, index: true })
  occurredAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AssessmentResultV2EntrySchema = SchemaFactory.createForClass(AssessmentResultV2Entry);
AssessmentResultV2EntrySchema.index({ "observations.skillId": 1, occurredAt: -1 });
