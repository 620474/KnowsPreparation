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

export interface CheckpointActiveLease {
  leaseId: string;
  itemId: string;
  leasedAt: Date;
  deadlineAt: Date;
}

@Schema({ timestamps: true, versionKey: false, collection: "checkpoint_sessions_v1" })
export class CheckpointSessionEntry {
  @Prop({ required: true, unique: true, index: true }) sessionId!: string;
  @Prop({ required: true, index: true }) targetId!: string;
  @Prop({ type: String, required: true, enum: ["active", "completed", "aborted", "expired", "recovery"], default: "active" }) status!: "active" | "completed" | "aborted" | "expired" | "recovery";
  @Prop({ required: true, default: 0 }) revision!: number;
  @Prop({ required: true }) availableMinutes!: number;
  @Prop({ type: [String], required: true }) reservedItemIds!: string[];
  @Prop({ type: String, default: null }) currentItemId!: string | null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) activeLease!: CheckpointActiveLease | null;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) attempts!: CheckpointStoredAttempt[];
  @Prop({ type: Date, required: true }) startedAt!: Date;
  @Prop({ type: Date, default: null }) completedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export const CheckpointSessionEntrySchema = SchemaFactory.createForClass(CheckpointSessionEntry);
CheckpointSessionEntrySchema.index({ targetId: 1, status: 1, updatedAt: -1 });
CheckpointSessionEntrySchema.index({ "attempts.operationId": 1 });
