import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import {
  ASSESSMENT_EVENT_V3_VERSION,
  SKILL_ONTOLOGY_VERSION,
  assessmentEventV3Schema,
  type AssessmentEventV3,
  type AssessmentResultV2,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { AssessmentEventV3Entry } from "../schemas/assessment-event-v3.schema";
import { EvidenceEventV2Entry } from "../schemas/evidence-event-v2.schema";

const stableId = (operationId: string) => createHash("sha256")
  .update(`assessment-v3:${operationId}`)
  .digest("hex");

const evaluatorType = (type: AssessmentResultV2["evaluator"]["type"]) =>
  type === "ai" ? "llm" as const : type;

export function projectAssessmentV2ToV3(
  assessment: AssessmentResultV2,
  provenance: AssessmentEventV3["provenance"] = { kind: "v2_projection", sourceEventId: null },
): AssessmentEventV3 {
  const taskId = assessment.source.itemId ?? assessment.source.entityId;
  return assessmentEventV3Schema.parse({
    eventId: stableId(assessment.operationId),
    operationId: assessment.operationId,
    schemaVersion: ASSESSMENT_EVENT_V3_VERSION,
    ontologyVersion: SKILL_ONTOLOGY_VERSION,
    targetId: assessment.source.track === "yandex" || assessment.source.track === "ozon"
      ? assessment.source.track
      : null,
    source: {
      kind: assessment.source.kind,
      entityId: assessment.source.entityId,
      taskId,
      taskVersion: assessment.source.itemVersion,
      conceptFamilyId: assessment.source.itemFamilyId,
      formId: `${taskId}:${assessment.source.itemVersion}`,
      contextFamilyId: assessment.source.track ?? assessment.source.kind,
      track: assessment.source.track,
    },
    conditions: {
      aiMode: assessment.assistance.mode === "no_ai"
        ? "none"
        : assessment.assistance.mode === "ai_assisted"
          ? "assisted"
          : "unknown",
      hintCount: assessment.assistance.hintCount,
      timed: false,
      timeLimitMs: null,
    },
    process: null,
    observations: assessment.observations.map((observation) => ({
      criterionId: observation.criterionId,
      skillId: observation.skillId,
      capability: observation.capability,
      score: observation.score,
      difficulty: 2,
      reliability: observation.reliability,
      rubricVersion: observation.rubricVersion,
    })),
    assistance: assessment.assistance,
    evaluator: {
      ...assessment.evaluator,
      type: evaluatorType(assessment.evaluator.type),
    },
    provenance,
    occurredAt: assessment.occurredAt,
  });
}

@Injectable()
export class EvidenceV3Service {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(AssessmentEventV3Entry.name)
    private readonly eventModel: Model<AssessmentEventV3Entry>,
    @InjectModel(EvidenceEventV2Entry.name)
    private readonly evidenceV2Model: Model<EvidenceEventV2Entry>,
  ) {}

  isWriteEnabled() {
    return this.config.get<string>("EVIDENCE_V3_WRITE") !== "false";
  }

  async recordProjection(assessment: AssessmentResultV2) {
    if (!this.isWriteEnabled()) return null;
    const event = projectAssessmentV2ToV3(assessment);
    await this.persist(event);
    return event.eventId;
  }

  async recordNative(event: AssessmentEventV3) {
    if (!this.isWriteEnabled()) return null;
    const parsed = assessmentEventV3Schema.parse(event);
    await this.eventModel.updateOne(
      { operationId: parsed.operationId },
      { $set: { ...parsed, occurredAt: new Date(parsed.occurredAt) } },
      { upsert: true },
    ).exec();
    return parsed.eventId;
  }

  async backfillV2() {
    if (!this.isWriteEnabled()) return 0;
    const existing = await this.eventModel.distinct("operationId").exec();
    const sourceEvents = await this.evidenceV2Model
      .find({ operationId: { $nin: existing } })
      .sort({ occurredAt: 1 })
      .lean()
      .exec();
    for (const source of sourceEvents) {
      const assessment = {
        assessmentResultId: source.assessmentResultId ?? source.eventId,
        operationId: source.operationId,
        schemaVersion: "2" as const,
        ontologyVersion: source.ontologyVersion,
        source: source.source,
        observations: source.observations,
        transferLevel: source.transferLevel,
        assistance: source.assistance,
        evaluator: source.evaluator,
        occurredAt: new Date(source.occurredAt).toISOString(),
      } satisfies AssessmentResultV2;
      await this.persist(projectAssessmentV2ToV3(assessment, {
        kind: source.provenance.kind === "legacy_projection" ? "legacy_projection" : "v2_projection",
        sourceEventId: source.eventId,
      }));
    }
    return sourceEvents.length;
  }

  listAll() {
    return this.eventModel.find().sort({ occurredAt: 1 }).lean().exec();
  }

  listForSkill(skillId: string, limit = 150) {
    return this.eventModel
      .find({ "observations.skillId": skillId })
      .sort({ occurredAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  private persist(event: AssessmentEventV3) {
    return this.eventModel.updateOne(
      { operationId: event.operationId },
      { $setOnInsert: { ...event, occurredAt: new Date(event.occurredAt) } },
      { upsert: true },
    ).exec();
  }
}
