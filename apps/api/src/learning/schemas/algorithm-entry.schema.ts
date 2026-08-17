import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export type AlgorithmEntryDocument = HydratedDocument<AlgorithmEntry>;

@Schema({ timestamps: true, versionKey: false })
export class AlgorithmEntry {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  pattern!: string;

  @Prop({ type: String, required: true, enum: DIFFICULTIES })
  difficulty!: Difficulty;

  @Prop({ required: true })
  solvedAt!: string;

  @Prop({ required: true, default: "" })
  note!: string;
}

export const AlgorithmEntrySchema = SchemaFactory.createForClass(AlgorithmEntry);
