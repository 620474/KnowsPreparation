import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type {
  InterviewTurnAssessment,
  InterviewTurnRole,
  InterviewerAction,
} from "@prep/contracts";
import { Schema as MongooseSchema, type HydratedDocument } from "mongoose";

export type InterviewTurnDocument = HydratedDocument<InterviewTurnEntry>;

@Schema({ timestamps: true, versionKey: false })
export class InterviewTurnEntry {
  @Prop({ required: true, index: true })
  turnId!: string;

  @Prop({ required: true, index: true })
  interviewId!: string;

  @Prop({ type: String, default: null })
  operationId!: string | null;

  @Prop({ required: true })
  sequence!: number;

  @Prop({ type: String, required: true, enum: ["interviewer", "candidate"] })
  role!: InterviewTurnRole;

  @Prop({ type: String, default: null })
  action!: InterviewerAction | null;

  @Prop({ required: true })
  questionId!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ type: String, default: null })
  answerText!: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  assessment!: InterviewTurnAssessment | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const InterviewTurnEntrySchema = SchemaFactory.createForClass(InterviewTurnEntry);
InterviewTurnEntrySchema.index({ interviewId: 1, sequence: 1 }, { unique: true });
InterviewTurnEntrySchema.index(
  { operationId: 1 },
  { unique: true, partialFilterExpression: { operationId: { $type: "string" } } },
);
