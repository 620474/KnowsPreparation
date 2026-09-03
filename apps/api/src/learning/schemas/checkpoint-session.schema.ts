import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type CheckpointSessionDocument = HydratedDocument<CheckpointSessionEntry>;
export interface CheckpointStoredAttempt {
  operationId: string;
  itemId: string;
  eventId: string;
  score: number;
  result: Record<string, unknown>;
}

@Schema({ timestamps: true, versionKey: false, collection: "checkpoint_sessions_v1" })
export class CheckpointSessionEntry {
  @Prop({ required: true, unique: true, index: true }) sessionId!: string;
  @Prop({ required: true, index: true }) targetId!: string;
  @Prop({ type: String, required: true, enum: ["active", "completed", "aborted"], default: "active" }) status!: "active" | "completed" | "aborted";
  @Prop({ required: true }) availableMinutes!: number;
  @Prop({ type: [String], required: true }) reservedItemIds!: string[];
  @Prop({ type: String, default: null }) currentItemId!: string | null;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) attempts!: CheckpointStoredAttempt[];
  @Prop({ type: Date, required: true }) startedAt!: Date;
  @Prop({ type: Date, default: null }) completedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export const CheckpointSessionEntrySchema = SchemaFactory.createForClass(CheckpointSessionEntry);
