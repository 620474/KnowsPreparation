import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { KnowledgeOverviewV3 } from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type MasterySnapshotV3Document = HydratedDocument<MasterySnapshotV3Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "mastery_snapshots_v3" })
export class MasterySnapshotV3Entry {
  @Prop({ required: true, unique: true, index: true })
  snapshotId!: string;

  @Prop({ required: true, index: true })
  targetId!: string;

  @Prop({ type: Date, required: true, index: true })
  asOf!: Date;

  @Prop({ required: true, min: 0 })
  evidenceEventCount!: number;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  overview!: KnowledgeOverviewV3;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MasterySnapshotV3EntrySchema = SchemaFactory.createForClass(MasterySnapshotV3Entry);
MasterySnapshotV3EntrySchema.index({ targetId: 1, asOf: -1 });
