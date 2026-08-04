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

  @Prop({ required: true, default: 10 })
  coreWeeks!: number;

  @Prop({ required: true, default: 2 })
  bufferWeeks!: number;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
