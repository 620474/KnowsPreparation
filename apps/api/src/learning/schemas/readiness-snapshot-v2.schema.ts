import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { KnowledgeOverviewV3 } from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type ReadinessSnapshotV2Document = HydratedDocument<ReadinessSnapshotV2Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "readiness_snapshots_v2" })
export class ReadinessSnapshotV2Entry {
  @Prop({ required: true, unique: true, index: true })
  snapshotId!: string;

  @Prop({ required: true, index: true })
  targetId!: string;

  @Prop({ type: String, default: null, index: true })
  applicationId!: string | null;

  @Prop({ type: Date, required: true, index: true })
  frozenAt!: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  overview!: KnowledgeOverviewV3;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  modelVersions!: Record<string, string | null>;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReadinessSnapshotV2EntrySchema = SchemaFactory.createForClass(ReadinessSnapshotV2Entry);
