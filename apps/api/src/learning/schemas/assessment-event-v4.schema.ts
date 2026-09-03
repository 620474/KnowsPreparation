import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { AssessmentEventV4 } from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type AssessmentEventV4Document = HydratedDocument<AssessmentEventV4Entry>;

@Schema({ timestamps: true, versionKey: false, collection: "assessment_events_v4" })
export class AssessmentEventV4Entry {
  @Prop({ required: true, unique: true, index: true }) eventId!: string;
  @Prop({ required: true, unique: true, index: true }) operationId!: string;
  @Prop({ required: true, default: "4" }) schemaVersion!: "4";
  @Prop({ required: true, index: true }) targetId!: string;
  @Prop({ required: true, index: true }) sessionId!: string;
  @Prop({ type: String, required: true }) mode!: AssessmentEventV4["mode"];
  @Prop({ type: String, required: true, index: true }) verificationEligibility!: AssessmentEventV4["verificationEligibility"];
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) itemRef!: AssessmentEventV4["itemRef"];
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) conditions!: AssessmentEventV4["conditions"];
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) process!: AssessmentEventV4["process"];
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) selfAssessment!: AssessmentEventV4["selfAssessment"];
  @Prop({ type: [MongooseSchema.Types.Mixed], required: true }) observations!: AssessmentEventV4["observations"];
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) integrity!: AssessmentEventV4["integrity"];
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) evaluator!: AssessmentEventV4["evaluator"];
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) provenance!: AssessmentEventV4["provenance"];
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) result!: Record<string, unknown> | null;
  @Prop({ type: Date, required: true, index: true }) occurredAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

export const AssessmentEventV4EntrySchema = SchemaFactory.createForClass(AssessmentEventV4Entry);
AssessmentEventV4EntrySchema.index({ targetId: 1, "observations.skillId": 1, occurredAt: -1 });
AssessmentEventV4EntrySchema.index({ "itemRef.familyId": 1, "itemRef.formId": 1, occurredAt: -1 });
