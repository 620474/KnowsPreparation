import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export const AI_CHAT_ROLES = ["user", "assistant"] as const;
export type AiChatRole = (typeof AI_CHAT_ROLES)[number];
export type AiChatMessageDocument = HydratedDocument<AiChatMessage>;

@Schema({ timestamps: true, versionKey: false })
export class AiChatMessage {
  @Prop({ required: true, index: true, default: "main" })
  courseKey!: string;

  @Prop({ required: true, index: true })
  courseVersion!: number;

  @Prop({ required: true, index: true })
  itemId!: string;

  @Prop({ type: String, required: true, enum: AI_CHAT_ROLES })
  role!: AiChatRole;

  @Prop({ required: true })
  content!: string;

  createdAt!: Date;
}

export const AiChatMessageSchema = SchemaFactory.createForClass(AiChatMessage);
AiChatMessageSchema.index({ courseKey: 1, courseVersion: 1, itemId: 1, createdAt: -1 });
