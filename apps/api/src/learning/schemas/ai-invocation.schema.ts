import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type AiInvocationDocument = HydratedDocument<AiInvocationEntry>;

@Schema({ timestamps: true, versionKey: false, collection: "ai_invocations" })
export class AiInvocationEntry {
  @Prop({ required: true, unique: true, index: true })
  invocationId!: string;

  @Prop({ required: true, index: true })
  operation!: string;

  @Prop({ required: true, index: true })
  model!: string;

  @Prop({ type: String, default: null })
  promptVersion!: string | null;

  @Prop({ type: String, default: null })
  schemaVersion!: string | null;

  @Prop({ required: true })
  durationMs!: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  usage!: Record<string, number> | null;

  @Prop({ type: String, required: true, enum: ["success", "error", "timeout"] })
  status!: "success" | "error" | "timeout";

  @Prop({ default: false })
  fallbackUsed!: boolean;

  @Prop({ type: Date, required: true, index: true })
  occurredAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AiInvocationEntrySchema = SchemaFactory.createForClass(AiInvocationEntry);
