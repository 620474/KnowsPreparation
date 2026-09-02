import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  EVIDENCE_EVENT_VERSION,
  MASTERY_MODEL_V2_VERSION,
  SKILL_ONTOLOGY_VERSION,
  type KnowledgeOverviewV2,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type MasterySnapshotV2Document = HydratedDocument<MasterySnapshotV2Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "mastery_snapshots_v2" })
export class MasterySnapshotV2Entry {
  @Prop({ required: true, unique: true, index: true })
  snapshotId!: string;

  @Prop({ type: String, required: true, default: SKILL_ONTOLOGY_VERSION })
  ontologyVersion!: typeof SKILL_ONTOLOGY_VERSION;

  @Prop({ type: String, required: true, default: EVIDENCE_EVENT_VERSION })
  evidenceVersion!: typeof EVIDENCE_EVENT_VERSION;

  @Prop({ type: String, required: true, default: MASTERY_MODEL_V2_VERSION })
  masteryModelVersion!: typeof MASTERY_MODEL_V2_VERSION;

  @Prop({ required: true, index: true })
  targetId!: string;

  @Prop({ type: Date, required: true, index: true })
  asOf!: Date;

  @Prop({ required: true, min: 0 })
  evidenceEventCount!: number;

  @Prop({ type: String, default: null })
  lastEvidenceAt!: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  overview!: KnowledgeOverviewV2;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MasterySnapshotV2EntrySchema = SchemaFactory.createForClass(MasterySnapshotV2Entry);
MasterySnapshotV2EntrySchema.index({ targetId: 1, asOf: -1 });
