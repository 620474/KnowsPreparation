import { createHash } from "node:crypto";

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import {
  EVIDENCE_EVENT_VERSION,
  MASTERY_MODEL_V2_VERSION,
  SKILL_ONTOLOGY_VERSION,
  evidenceEventV2Schema,
  type EvidenceEventV2,
  type KnowledgeOverviewV2,
  type SkillDetailV2,
  type SkillMasteryV2,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { EvidenceV2Service } from "../evidence/evidence-v2.service";
import { MasterySnapshotV2Entry } from "../schemas/mastery-snapshot-v2.schema";
import { SKILL_ONTOLOGY, getSkillDefinition } from "../skills/skill-ontology";
import { replaySkillMasteryV2 } from "./mastery-v2-calculator";

const TARGETS: Record<string, { label: string; skills: Record<string, number> }> = {
  general: {
    label: "Frontend Middle+/Senior",
    skills: {
      javascript: 1.2, async: 1.1, react: 1.2, typescript: 0.8, browser: 0.9,
      algorithms: 0.8, testing: 0.7, architecture: 0.8, "css-a11y": 0.6,
    },
  },
  yandex: {
    label: "Яндекс Frontend",
    skills: {
      javascript: 1.4, async: 1.3, algorithms: 1.3, browser: 1,
      react: 0.9, typescript: 0.7, architecture: 0.7,
    },
  },
  ozon: {
    label: "Ozon Frontend",
    skills: {
      javascript: 1.2, async: 1, react: 1.2, typescript: 1,
      algorithms: 0.9, architecture: 0.9, testing: 0.8,
    },
  },
};

const weightedAverage = (items: Array<{ value: number; weight: number }>) => {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  return total ? Math.round(items.reduce((sum, item) => sum + item.value * item.weight, 0) / total) : 50;
};

@Injectable()
export class MasteryV2Service {
  private readonly logger = new Logger(MasteryV2Service.name);

  constructor(
    private readonly config: ConfigService,
    private readonly evidence: EvidenceV2Service,
    @InjectModel(MasterySnapshotV2Entry.name)
    private readonly snapshotModel: Model<MasterySnapshotV2Entry>,
  ) {}

  isShadowEnabled() {
    return this.config.get<string>("MASTERY_V2_SHADOW") !== "false";
  }

  async captureShadow(targetId = "general") {
    if (!this.isShadowEnabled()) return null;
    try {
      return await this.getOverview(targetId);
    } catch (error) {
      this.logger.warn({
        event: "mastery_v2_shadow_failed",
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getOverview(targetId = "general"): Promise<KnowledgeOverviewV2> {
    await this.evidence.backfillLegacy();
    const evidence = (await this.evidence.listAll()).map((event) => evidenceEventV2Schema.parse({
      ...event,
      occurredAt: new Date(event.occurredAt).toISOString(),
    }));
    const now = new Date();
    const skills = SKILL_ONTOLOGY.map((definition) => replaySkillMasteryV2(definition, evidence, now));
    const overview: KnowledgeOverviewV2 = {
      ontologyVersion: SKILL_ONTOLOGY_VERSION,
      evidenceVersion: EVIDENCE_EVENT_VERSION,
      masteryModelVersion: MASTERY_MODEL_V2_VERSION,
      generatedAt: now.toISOString(),
      readiness: this.buildTargetReadiness(targetId, skills),
      skills: skills.sort((left, right) => left.estimate - right.estimate),
    };
    await this.saveSnapshot(overview, evidence);
    return overview;
  }

  async getSkillDetail(skillId: string): Promise<SkillDetailV2> {
    await this.evidence.backfillLegacy();
    const definition = getSkillDefinition(skillId);
    if (!definition) throw new NotFoundException("Навык не найден");
    const evidence = (await this.evidence.listForSkill(skillId)).map((event) => evidenceEventV2Schema.parse({
      ...event,
      occurredAt: new Date(event.occurredAt).toISOString(),
    }));
    return {
      ontologyVersion: SKILL_ONTOLOGY_VERSION,
      evidenceVersion: EVIDENCE_EVENT_VERSION,
      definition,
      mastery: replaySkillMasteryV2(definition, evidence),
      evidence,
    };
  }

  private buildTargetReadiness(targetId: string, skills: SkillMasteryV2[]) {
    const selectedTargetId = TARGETS[targetId] ? targetId : "general";
    const target = TARGETS[selectedTargetId]!;
    const selected = Object.entries(target.skills).flatMap(([skillId, weight]) => {
      const mastery = skills.find((skill) => skill.skillId === skillId);
      return mastery ? [{ mastery, weight }] : [];
    });
    const evidenceCount = selected.reduce((sum, item) => sum + item.mastery.evidenceCount, 0);
    const transferEvidenceCount = selected.reduce(
      (sum, item) => sum + item.mastery.transferEvidenceCount,
      0,
    );
    const noAiEvidenceCount = selected.reduce((sum, item) => sum + item.mastery.noAiEvidenceCount, 0);
    const coverage = weightedAverage(selected.map((item) => ({
      value: item.mastery.capabilityCoverage,
      weight: item.weight,
    })));
    const confidence = coverage === 100 && selected.every((item) => item.mastery.confidence === "high")
      ? "high"
      : coverage >= 60 && selected.some((item) => item.mastery.confidence !== "low")
        ? "medium"
        : "low";
    return {
      targetId: selectedTargetId,
      targetLabel: target.label,
      estimate: weightedAverage(selected.map((item) => ({ value: item.mastery.estimate, weight: item.weight }))),
      lower: weightedAverage(selected.map((item) => ({ value: item.mastery.lower, weight: item.weight }))),
      upper: weightedAverage(selected.map((item) => ({ value: item.mastery.upper, weight: item.weight }))),
      coverage,
      transferCoverage: evidenceCount ? Math.round((transferEvidenceCount / evidenceCount) * 100) : 0,
      integrityCoverage: evidenceCount ? Math.round((noAiEvidenceCount / evidenceCount) * 100) : 0,
      evidenceCount,
      unknownSkillCount: selected.filter((item) => item.mastery.capabilityCoverage === 0).length,
      confidence,
    } as const;
  }

  private async saveSnapshot(overview: KnowledgeOverviewV2, evidence: EvidenceEventV2[]) {
    const lastEvidenceAt = evidence.at(-1)?.occurredAt ?? null;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({
        targetId: overview.readiness.targetId,
        events: evidence.map((event) => ({
          eventId: event.eventId,
          provenance: event.provenance.kind,
          observations: event.observations.map((item) => [
            item.criterionId, item.skillId, item.capability, item.score, item.reliability,
          ]),
        })),
      }))
      .digest("hex");
    await this.snapshotModel.updateOne(
      { snapshotId: fingerprint },
      {
        $setOnInsert: {
          snapshotId: fingerprint,
          ontologyVersion: SKILL_ONTOLOGY_VERSION,
          evidenceVersion: EVIDENCE_EVENT_VERSION,
          masteryModelVersion: MASTERY_MODEL_V2_VERSION,
          targetId: overview.readiness.targetId,
          asOf: new Date(overview.generatedAt),
          evidenceEventCount: evidence.length,
          lastEvidenceAt,
          overview,
        },
      },
      { upsert: true },
    ).exec();
  }
}
