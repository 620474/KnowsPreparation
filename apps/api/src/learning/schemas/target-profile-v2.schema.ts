import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { TargetRequirementV2 } from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type TargetProfileV2Document = HydratedDocument<TargetProfileV2Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "target_profiles_v2" })
export class TargetProfileV2Entry {
  @Prop({ required: true, unique: true, index: true })
  targetId!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ type: String, default: null })
  company!: string | null;

  @Prop({ type: String, default: null })
  role!: string | null;

  @Prop({ type: String, default: null })
  seniority!: string | null;

  @Prop({ type: Date, default: null, index: true })
  interviewAt!: Date | null;

  @Prop({ type: String, default: null, index: true })
  vacancyHash!: string | null;

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true })
  requirements!: TargetRequirementV2[];

  @Prop({ type: String, required: true, default: "2" })
  version!: "2";

  createdAt!: Date;
  updatedAt!: Date;
}

export const TargetProfileV2EntrySchema = SchemaFactory.createForClass(TargetProfileV2Entry);
