import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type {
  AdaptivePlanItem,
  LearningMissionStatus,
  SkillCapability,
  TransferAssessmentItem,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type LearningMissionDocument = HydratedDocument<LearningMission>;

@Schema({ timestamps: true, versionKey: false, collection: "learning_missions" })
export class LearningMission {
  @Prop({ required: true, unique: true, index: true })
  missionId!: string;

  @Prop({ required: true, index: true })
  targetId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  reason!: string;

  @Prop({ required: true, index: true })
  skillId!: string;

  @Prop({ required: true })
  skillLabel!: string;

  @Prop({ type: String, required: true })
  capability!: SkillCapability;

  @Prop({ type: String, required: true, index: true })
  status!: LearningMissionStatus;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  baseline!: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  objective!: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  intervention!: AdaptivePlanItem;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  verification!: TransferAssessmentItem;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  delayedVerification!: TransferAssessmentItem;

  @Prop({ required: true, default: 0 })
  verificationAttempts!: number;

  @Prop({ type: [String], required: true, default: [] })
  verificationEvidenceIds!: string[];

  @Prop({ type: Date, default: null, index: true })
  dueAt!: Date | null;

  @Prop({ type: Date, default: null, index: true })
  deferredUntil!: Date | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const LearningMissionSchema = SchemaFactory.createForClass(LearningMission);
LearningMissionSchema.index({ targetId: 1, status: 1, updatedAt: -1 });
LearningMissionSchema.index({ skillId: 1, createdAt: -1 });
