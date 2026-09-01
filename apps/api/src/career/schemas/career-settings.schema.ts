import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { CareerSearchMode, CareerWeeklyGoals } from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

export type CareerSettingsDocument = HydratedDocument<CareerSettingsEntry>;

@Schema({ timestamps: true, versionKey: false })
export class CareerSettingsEntry {
  @Prop({ required: true, unique: true, default: "main" })
  key!: string;

  @Prop({ type: String, default: "working" })
  searchMode!: CareerSearchMode;

  @Prop({
    type: Object,
    default: { applications: 8, outreach: 5, referrals: 2, interviews: 2 },
  })
  weeklyGoals!: CareerWeeklyGoals;

  @Prop({ default: "" })
  strategyNotes!: string;

  @Prop({ default: "" })
  candidateProfile!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CareerSettingsEntrySchema = SchemaFactory.createForClass(
  CareerSettingsEntry,
);
