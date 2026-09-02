import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { LearningMissionEventType, LearningMissionStatus } from "@prep/contracts";
import type { HydratedDocument } from "mongoose";

export type LearningMissionEventDocument = HydratedDocument<LearningMissionEventEntry>;

@Schema({ timestamps: true, versionKey: false, collection: "learning_mission_events" })
export class LearningMissionEventEntry {
  @Prop({ required: true, unique: true, index: true })
  eventId!: string;

  @Prop({ required: true, unique: true, index: true })
  operationId!: string;

  @Prop({ required: true, index: true })
  missionId!: string;

  @Prop({ type: String, required: true })
  type!: LearningMissionEventType;

  @Prop({ type: String, default: null })
  fromStatus!: LearningMissionStatus | null;

  @Prop({ type: String, required: true })
  toStatus!: LearningMissionStatus;

  @Prop({ required: true, default: "" })
  note!: string;

  @Prop({ type: Date, required: true, index: true })
  occurredAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const LearningMissionEventEntrySchema = SchemaFactory.createForClass(LearningMissionEventEntry);
LearningMissionEventEntrySchema.index({ missionId: 1, occurredAt: 1 });
