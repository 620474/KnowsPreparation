import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { ReadinessV9 } from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type ReadinessSnapshotV3Document = HydratedDocument<ReadinessSnapshotV3Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "readiness_snapshots_v3" })
export class ReadinessSnapshotV3Entry {
  @Prop({ required: true, unique: true, index: true }) snapshotId!: string;
  @Prop({ required: true, index: true }) targetId!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) readiness!: ReadinessV9;
  @Prop({ type: Date, required: true }) frozenAt!: Date;
}

export const ReadinessSnapshotV3EntrySchema = SchemaFactory.createForClass(ReadinessSnapshotV3Entry);
