import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { ResearchClaim } from "@prep/contracts";

export type ResearchClaimDocument = HydratedDocument<ResearchClaimEntry>;

@Schema({ timestamps: true, versionKey: false })
export class ResearchClaimEntry {
  @Prop({ required: true, unique: true, index: true })
  claimId!: string;

  @Prop({ required: true, index: true })
  projectId!: string;

  @Prop({ required: true })
  text!: string;

  @Prop({ type: String, required: true })
  status!: ResearchClaim["status"];

  @Prop({ type: String, required: true })
  confidence!: ResearchClaim["confidence"];

  @Prop({ type: [String], default: [] })
  evidenceIds!: string[];

  @Prop({ default: "" })
  alternativeExplanations!: string;

  @Prop({ default: "" })
  uncertainty!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ResearchClaimEntrySchema = SchemaFactory.createForClass(
  ResearchClaimEntry,
);
ResearchClaimEntrySchema.index({ projectId: 1, updatedAt: -1 });
