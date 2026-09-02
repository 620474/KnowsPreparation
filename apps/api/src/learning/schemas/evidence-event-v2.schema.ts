import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  EVIDENCE_EVENT_VERSION,
  SKILL_ONTOLOGY_VERSION,
  type AssessmentObservationV2,
  type EvidenceAssistance,
  type EvidenceEvaluator,
  type EvidenceProvenanceV2,
  type EvidenceSource,
  type SkillTransferLevel,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type EvidenceEventV2Document = HydratedDocument<EvidenceEventV2Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "evidence_events_v2" })
export class EvidenceEventV2Entry {
  @Prop({ required: true, unique: true, index: true })
  eventId!: string;

  @Prop({ required: true, unique: true, index: true })
  operationId!: string;

  @Prop({ type: String, required: true, default: EVIDENCE_EVENT_VERSION })
  evidenceVersion!: typeof EVIDENCE_EVENT_VERSION;

  @Prop({ type: String, required: true, default: SKILL_ONTOLOGY_VERSION })
  ontologyVersion!: typeof SKILL_ONTOLOGY_VERSION;

  @Prop({ type: String, default: null, index: true })
  assessmentResultId!: string | null;

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

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  provenance!: EvidenceProvenanceV2;

  @Prop({ type: Date, required: true, index: true })
  occurredAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const EvidenceEventV2EntrySchema = SchemaFactory.createForClass(EvidenceEventV2Entry);
EvidenceEventV2EntrySchema.index({ "observations.skillId": 1, occurredAt: -1 });
EvidenceEventV2EntrySchema.index({ "source.itemFamilyId": 1, occurredAt: -1 });
