import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { LEGACY_RESEARCH_PIPELINE_CONFIGURATION } from "@prep/contracts";
import type {
  ResearchAgentDraft,
  ResearchAgentLogEntry,
  ResearchAgentMode,
  ResearchAgentPhase,
  ResearchPipelineConfiguration,
  ResearchAgentRunStatus,
  ResearchAgentType,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type ResearchAgentRunDocument = HydratedDocument<ResearchAgentRunEntry>;

@Schema({ timestamps: true, versionKey: false })
export class ResearchAgentRunEntry {
  @Prop({ required: true, unique: true, index: true })
  runId!: string;

  @Prop({ required: true, index: true })
  projectId!: string;

  @Prop({ type: String, default: null })
  activeProjectId!: string | null;

  @Prop({ required: true })
  operationId!: string;

  @Prop({ type: String, required: true })
  type!: ResearchAgentType;

  @Prop({ type: String, required: true })
  mode!: ResearchAgentMode;

  @Prop({ type: String, required: true, index: true })
  status!: ResearchAgentRunStatus;

  @Prop({ type: String, required: true })
  phase!: ResearchAgentPhase;

  @Prop({ required: true, min: 0, max: 100 })
  progress!: number;

  @Prop({ required: true })
  model!: string;

  @Prop({ required: true })
  reviewModel!: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
    default: () => ({ ...LEGACY_RESEARCH_PIPELINE_CONFIGURATION }),
  })
  configuration!: ResearchPipelineConfiguration;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  budget!: {
    maximumModelCalls: number;
    maximumSolCalls: number;
    maximumSources: number;
    maximumDurationMinutes: number;
  };

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  usage!: {
    modelCalls: number;
    solCalls: number;
    sourcesDiscovered: number;
    sourcesAccepted: number;
    validatedClaims: number;
  };

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  draft!: ResearchAgentDraft;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  logs!: ResearchAgentLogEntry[];

  @Prop({ type: String, default: null })
  error!: string | null;

  @Prop({ type: Date, default: null, index: true })
  leaseUntil!: Date | null;

  @Prop({ type: String, default: null })
  leaseOwner!: string | null;

  @Prop({ type: Number, default: 0 })
  leaseEpoch!: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  currentInvocation!: {
    step: string;
    responseId: string | null;
    status: "creating" | "waiting";
    model: string;
    startedAt: Date;
  } | null;

  @Prop({ type: String, default: null })
  applyOperationId!: string | null;

  @Prop({ type: Date, default: null })
  appliedAt!: Date | null;

  @Prop({ type: Date, default: null })
  startedAt!: Date | null;

  @Prop({ type: Date, default: null })
  baseProjectUpdatedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ResearchAgentRunEntrySchema = SchemaFactory.createForClass(
  ResearchAgentRunEntry,
);
ResearchAgentRunEntrySchema.index({ projectId: 1, operationId: 1 }, { unique: true });
ResearchAgentRunEntrySchema.index({ projectId: 1, createdAt: -1 });
ResearchAgentRunEntrySchema.index(
  { activeProjectId: 1 },
  {
    unique: true,
    partialFilterExpression: { activeProjectId: { $type: "string" } },
  },
);
