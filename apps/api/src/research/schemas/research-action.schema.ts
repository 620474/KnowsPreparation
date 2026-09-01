import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type {
  ResearchActionStatus,
  ResearchActionType,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type ResearchActionDocument = HydratedDocument<ResearchActionEntry>;

@Schema({ timestamps: true, versionKey: false })
export class ResearchActionEntry {
  @Prop({ required: true, unique: true, index: true })
  actionId!: string;

  @Prop({ required: true, index: true })
  projectId!: string;

  @Prop({ required: true, index: true })
  runId!: string;

  @Prop({ type: String, required: true })
  type!: ResearchActionType;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  reason!: string;

  @Prop({ required: true })
  expectedOutcome!: string;

  @Prop({ required: true, min: 1, max: 5 })
  priority!: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  payload!: { details: string; targetId: string | null };

  @Prop({ type: String, required: true, index: true })
  status!: ResearchActionStatus;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ResearchActionEntrySchema = SchemaFactory.createForClass(
  ResearchActionEntry,
);
ResearchActionEntrySchema.index({ projectId: 1, status: 1, priority: -1 });
