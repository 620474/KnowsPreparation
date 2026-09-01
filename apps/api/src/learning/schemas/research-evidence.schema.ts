import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { ResearchEvidence } from "@prep/contracts";

export type ResearchEvidenceDocument = HydratedDocument<ResearchEvidenceEntry>;

@Schema({ timestamps: true, versionKey: false })
export class ResearchEvidenceEntry {
  @Prop({ required: true, unique: true, index: true })
  evidenceId!: string;

  @Prop({ required: true, index: true })
  projectId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: "" })
  url!: string;

  @Prop({ default: "" })
  sourceType!: string;

  @Prop({ type: String, required: true })
  stance!: ResearchEvidence["stance"];

  @Prop({ type: String, required: true })
  quality!: ResearchEvidence["quality"];

  @Prop({ default: "" })
  notes!: string;

  @Prop({ type: String, default: "unassessed" })
  sourceKind!: ResearchEvidence["sourceKind"];

  @Prop({ default: "" })
  author!: string;

  @Prop({ type: String, default: null })
  publishedAt!: string | null;

  @Prop({ type: String, default: null })
  accessedAt!: string | null;

  @Prop({ default: "" })
  originId!: string;

  @Prop({ type: String, default: "unknown" })
  independence!: ResearchEvidence["independence"];

  @Prop({ type: String, default: "unassessed" })
  freshness!: ResearchEvidence["freshness"];

  createdAt!: Date;
  updatedAt!: Date;
}

export const ResearchEvidenceEntrySchema = SchemaFactory.createForClass(
  ResearchEvidenceEntry,
);
ResearchEvidenceEntrySchema.index({ projectId: 1, updatedAt: -1 });
