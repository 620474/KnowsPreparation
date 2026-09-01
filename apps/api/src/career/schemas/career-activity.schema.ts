import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { CareerActivityType } from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

export type CareerActivityDocument = HydratedDocument<CareerActivityEntry>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
export class CareerActivityEntry {
  @Prop({ required: true, unique: true, index: true })
  activityId!: string;

  @Prop({ type: String, default: null, index: true })
  applicationId!: string | null;

  @Prop({ type: String, required: true, index: true })
  type!: CareerActivityType;

  @Prop({ type: String, required: true, index: true })
  occurredAt!: string;

  @Prop({ default: "" })
  note!: string;

  createdAt!: Date;
}

export const CareerActivityEntrySchema = SchemaFactory.createForClass(
  CareerActivityEntry,
);
CareerActivityEntrySchema.index({ occurredAt: -1, type: 1 });
