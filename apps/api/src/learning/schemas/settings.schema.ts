import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SettingsDocument = HydratedDocument<Settings>;

@Schema({ timestamps: true, versionKey: false })
export class Settings {
  @Prop({ required: true, unique: true, default: "main" })
  key!: string;

  @Prop({ required: true })
  startDate!: string;

  @Prop({ required: true, default: 120 })
  dailyMinutes!: number;

  @Prop({ required: true, default: 11 })
  coreWeeks!: number;

  @Prop({ required: true, default: 1 })
  bufferWeeks!: number;

  @Prop({ required: true, default: false })
  reminderEnabled!: boolean;

  @Prop({ required: true, default: "19:00" })
  reminderTime!: string;

  @Prop({ required: true, default: true })
  adaptiveTodayEnabled!: boolean;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
