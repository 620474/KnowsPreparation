import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { SKILL_ONTOLOGY_VERSION, type SkillMastery } from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type MasterySnapshotDocument = HydratedDocument<MasterySnapshot>;

@Schema({ timestamps: true, versionKey: false })
export class MasterySnapshot {
  @Prop({ type: String, required: true, default: SKILL_ONTOLOGY_VERSION })
  ontologyVersion!: typeof SKILL_ONTOLOGY_VERSION;

  @Prop({ required: true })
  masteryModelVersion!: string;

  @Prop({ required: true, index: true })
  skillId!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  mastery!: SkillMastery;

  @Prop({ type: Date, required: true })
  calculatedAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MasterySnapshotSchema = SchemaFactory.createForClass(MasterySnapshot);
MasterySnapshotSchema.index(
  { ontologyVersion: 1, masteryModelVersion: 1, skillId: 1 },
  { unique: true },
);
