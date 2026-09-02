import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  SKILL_ONTOLOGY_VERSION,
  type EvidenceAssistanceMode,
  type EvidenceEvaluatorType,
  type EvidenceSourceKind,
  type SkillCapability,
  type SkillTransferLevel,
} from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

export type EvidenceEventDocument = HydratedDocument<EvidenceEvent>;

@Schema({ _id: false, versionKey: false })
export class EvidenceObservation {
  @Prop({ required: true, index: true })
  skillId!: string;

  @Prop({ type: String, required: true })
  capability!: SkillCapability;

  @Prop({ required: true, min: 0, max: 100 })
  score!: number;

  @Prop({ required: true, min: 0, max: 1 })
  reliability!: number;
}

const EvidenceObservationSchema = SchemaFactory.createForClass(EvidenceObservation);

@Schema({ _id: false, versionKey: false })
export class EvidenceSource {
  @Prop({ type: String, required: true })
  kind!: EvidenceSourceKind;

  @Prop({ required: true, index: true })
  entityId!: string;

  @Prop({ type: String, default: null })
  itemId!: string | null;

  @Prop({ required: true, default: "legacy-v1" })
  itemVersion!: string;

  @Prop({ required: true, index: true })
  itemFamilyId!: string;

  @Prop({ type: String, default: null })
  track!: string | null;
}

const EvidenceSourceSchema = SchemaFactory.createForClass(EvidenceSource);

@Schema({ _id: false, versionKey: false })
export class EvidenceAssistance {
  @Prop({ type: String, required: true })
  mode!: EvidenceAssistanceMode;

  @Prop({ required: true, min: 0, default: 0 })
  hintCount!: number;

  @Prop({ required: true, default: false })
  solutionViewed!: boolean;
}

const EvidenceAssistanceSchema = SchemaFactory.createForClass(EvidenceAssistance);

@Schema({ _id: false, versionKey: false })
export class EvidenceEvaluator {
  @Prop({ type: String, required: true })
  type!: EvidenceEvaluatorType;

  @Prop({ required: true })
  evaluatorVersion!: string;

  @Prop({ type: String, default: null })
  model!: string | null;

  @Prop({ type: String, default: null })
  promptVersion!: string | null;

  @Prop({ type: String, default: null })
  schemaVersion!: string | null;
}

const EvidenceEvaluatorSchema = SchemaFactory.createForClass(EvidenceEvaluator);

@Schema({ timestamps: true, versionKey: false })
export class EvidenceEvent {
  @Prop({ required: true, unique: true, index: true })
  eventId!: string;

  @Prop({ required: true, unique: true, index: true })
  operationId!: string;

  @Prop({ type: String, required: true, default: SKILL_ONTOLOGY_VERSION })
  ontologyVersion!: typeof SKILL_ONTOLOGY_VERSION;

  @Prop({ type: EvidenceSourceSchema, required: true })
  source!: EvidenceSource;

  @Prop({ type: [EvidenceObservationSchema], required: true })
  observations!: EvidenceObservation[];

  @Prop({ type: String, required: true })
  transferLevel!: SkillTransferLevel;

  @Prop({ type: EvidenceAssistanceSchema, required: true })
  assistance!: EvidenceAssistance;

  @Prop({ type: EvidenceEvaluatorSchema, required: true })
  evaluator!: EvidenceEvaluator;

  @Prop({ type: Date, required: true, index: true })
  occurredAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const EvidenceEventSchema = SchemaFactory.createForClass(EvidenceEvent);
EvidenceEventSchema.index({ "observations.skillId": 1, occurredAt: -1 });
EvidenceEventSchema.index({ "source.itemFamilyId": 1, occurredAt: -1 });
