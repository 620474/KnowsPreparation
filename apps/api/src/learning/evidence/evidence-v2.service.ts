import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import {
  ASSESSMENT_RESULT_VERSION,
  EVIDENCE_EVENT_VERSION,
  SKILL_ONTOLOGY_VERSION,
  assessmentResultV2Schema,
  evidenceEventV2Schema,
  type AssessmentObservationV2,
  type AssessmentResultV2,
  type EvidenceAssistance,
  type EvidenceEvaluator,
  type EvidenceEventV2,
  type EvidenceSourceKind,
  type SkillTransferLevel,
  type TrackKey,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { AssessmentResultV2Entry } from "../schemas/assessment-result-v2.schema";
import { EvidenceEvent } from "../schemas/evidence-event.schema";
import { EvidenceEventV2Entry } from "../schemas/evidence-event-v2.schema";

export interface NativeAssessmentDraft {
  operationId: string;
  source: {
    kind: EvidenceSourceKind;
    itemId: string | null;
    itemVersion: string;
    itemFamilyId: string;
    track: TrackKey | null;
  };
  observations: AssessmentObservationV2[];
  transferLevel: SkillTransferLevel;
  assistance: EvidenceAssistance;
  evaluator: EvidenceEvaluator;
  occurredAt: Date | string;
}

const stableId = (prefix: string, operationId: string) => createHash("sha256")
  .update(`${prefix}:${operationId}`)
  .digest("hex");

export function buildAssessmentResultV2(draft: NativeAssessmentDraft): AssessmentResultV2 {
  return assessmentResultV2Schema.parse({
    assessmentResultId: stableId("assessment-v2", draft.operationId),
    operationId: draft.operationId,
    schemaVersion: ASSESSMENT_RESULT_VERSION,
    ontologyVersion: SKILL_ONTOLOGY_VERSION,
    source: {
      ...draft.source,
      entityId: draft.operationId,
    },
    observations: draft.observations,
    transferLevel: draft.transferLevel,
    assistance: draft.assistance,
    evaluator: draft.evaluator,
    occurredAt: new Date(draft.occurredAt).toISOString(),
  });
}

const nativeEvent = (assessment: AssessmentResultV2): EvidenceEventV2 => evidenceEventV2Schema.parse({
  ...assessment,
  schemaVersion: undefined,
  eventId: stableId("evidence-v2", assessment.operationId),
  evidenceVersion: EVIDENCE_EVENT_VERSION,
  assessmentResultId: assessment.assessmentResultId,
  provenance: { kind: "native", sourceEventId: null },
});

@Injectable()
export class EvidenceV2Service {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(AssessmentResultV2Entry.name)
    private readonly assessmentModel: Model<AssessmentResultV2Entry>,
    @InjectModel(EvidenceEventV2Entry.name)
    private readonly evidenceV2Model: Model<EvidenceEventV2Entry>,
    @InjectModel(EvidenceEvent.name)
    private readonly evidenceV1Model: Model<EvidenceEvent>,
  ) {}

  isWriteEnabled() {
    return this.config.get<string>("EVIDENCE_V2_WRITE") !== "false";
  }

  async recordNative(draft: NativeAssessmentDraft) {
    if (!this.isWriteEnabled() || !draft.observations.length) return null;
    const assessment = buildAssessmentResultV2(draft);
    const evidence = nativeEvent(assessment);
    await this.assessmentModel.updateOne(
      { operationId: assessment.operationId },
      { $setOnInsert: { ...assessment, occurredAt: new Date(assessment.occurredAt) } },
      { upsert: true },
    ).exec();
    await this.evidenceV2Model.updateOne(
      { operationId: evidence.operationId },
      { $set: { ...evidence, occurredAt: new Date(evidence.occurredAt) } },
      { upsert: true },
    ).exec();
    return evidence.eventId;
  }

  async backfillLegacy() {
    const existingOperationIds = await this.evidenceV2Model.distinct("operationId").exec();
    const legacy = await this.evidenceV1Model
      .find({ operationId: { $nin: existingOperationIds } })
      .sort({ occurredAt: 1 })
      .lean()
      .exec();
    if (!legacy.length) return 0;
    await this.evidenceV2Model.bulkWrite(legacy.map((event) => ({
      updateOne: {
        filter: { operationId: event.operationId },
        update: {
          $setOnInsert: {
            eventId: stableId("evidence-v2", event.operationId),
            operationId: event.operationId,
            evidenceVersion: EVIDENCE_EVENT_VERSION,
            ontologyVersion: SKILL_ONTOLOGY_VERSION,
            assessmentResultId: null,
            source: event.source,
            observations: event.observations.map((observation) => ({
              ...observation,
              criterionId: `legacy:${observation.capability}`,
              rubricVersion: event.evaluator.evaluatorVersion,
              weight: 1,
            })),
            transferLevel: event.transferLevel,
            assistance: event.assistance,
            evaluator: event.evaluator,
            provenance: { kind: "legacy_projection", sourceEventId: event.eventId },
            occurredAt: event.occurredAt,
          },
        },
        upsert: true,
      },
    })));
    return legacy.length;
  }

  listAll() {
    return this.evidenceV2Model.find().sort({ occurredAt: 1 }).lean().exec();
  }

  listForSkill(skillId: string, limit = 100) {
    return this.evidenceV2Model
      .find({ "observations.skillId": skillId })
      .sort({ occurredAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
