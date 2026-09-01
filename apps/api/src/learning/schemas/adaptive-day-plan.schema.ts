import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { AdaptivePlanCheckIn, AdaptivePlanItem } from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type AdaptiveDayPlanDocument = HydratedDocument<AdaptiveDayPlan>;

@Schema({ timestamps: true, versionKey: false })
export class AdaptiveDayPlan {
  @Prop({ required: true, unique: true, index: true })
  date!: string;

  @Prop({ required: true })
  fingerprint!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  checkIn!: AdaptivePlanCheckIn;

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true, default: [] })
  items!: AdaptivePlanItem[];

  @Prop({ required: true, enum: ["ai", "deterministic"] })
  strategy!: "ai" | "deterministic";

  @Prop({ default: "" })
  rationale!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AdaptiveDayPlanSchema = SchemaFactory.createForClass(AdaptiveDayPlan);
