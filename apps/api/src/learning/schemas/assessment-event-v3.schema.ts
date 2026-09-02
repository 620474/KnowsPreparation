import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  ASSESSMENT_EVENT_V3_VERSION,
  SKILL_ONTOLOGY_VERSION,
  type AssessmentConditionsV3,
  type AssessmentEvaluatorV3,
  type AssessmentEventV3,
  type AssessmentObservationV3,
  type AssessmentProcessV3,
  type AssessmentSourceV3,
  type EvidenceAssistance,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type AssessmentEventV3Document = HydratedDocument<AssessmentEventV3Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "assessment_events_v3" })
export class AssessmentEventV3Entry {
  @Prop({ required: true, unique: true, index: true })
  eventId!: string;

  @Prop({ required: true, unique: true, index: true })
  operationId!: string;

  @Prop({ type: String, required: true, default: ASSESSMENT_EVENT_V3_VERSION })
  schemaVersion!: typeof ASSESSMENT_EVENT_V3_VERSION;

  @Prop({ type: String, required: true, default: SKILL_ONTOLOGY_VERSION })
  ontologyVersion!: typeof SKILL_ONTOLOGY_VERSION;

  @Prop({ type: String, default: null, index: true })
  targetId!: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  source!: AssessmentSourceV3;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  conditions!: AssessmentConditionsV3;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  process!: AssessmentProcessV3;

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true })
  observations!: AssessmentObservationV3[];

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  assistance!: EvidenceAssistance;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  evaluator!: AssessmentEvaluatorV3;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  provenance!: AssessmentEventV3["provenance"];

  @Prop({ type: Date, required: true, index: true })
  occurredAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AssessmentEventV3EntrySchema = SchemaFactory.createForClass(AssessmentEventV3Entry);
AssessmentEventV3EntrySchema.index({ "observations.skillId": 1, occurredAt: -1 });
AssessmentEventV3EntrySchema.index({ "source.conceptFamilyId": 1, "source.formId": 1 });
