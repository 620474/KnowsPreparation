import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  SKILL_ONTOLOGY_VERSION,
  type EvidenceEvent as EvidenceEventContract,
  type KnowledgeOverview,
  type MasteryShadowComparison,
  type SkillDetail,
  type SkillMastery,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { EvidenceService } from "../evidence/evidence.service";
import { SKILL_ONTOLOGY, getSkillDefinition } from "../skills/skill-ontology";
import { buildSkillMastery, MASTERY_MODEL_VERSION } from "./mastery-calculator";
import { MasterySnapshot } from "../schemas/mastery-snapshot.schema";
import { MasteryV2Service } from "./mastery-v2.service";

const TARGETS: Record<string, { label: string; skills: Record<string, number> }> = {
  general: {
    label: "Frontend Middle+/Senior",
    skills: {
      javascript: 1.2,
      async: 1.1,
      react: 1.2,
      typescript: 0.8,
      browser: 0.9,
      algorithms: 0.8,
      testing: 0.7,
      architecture: 0.8,
      "css-a11y": 0.6,
    },
  },
  yandex: {
    label: "Яндекс Frontend",
    skills: {
      javascript: 1.4,
      async: 1.3,
      algorithms: 1.3,
      browser: 1,
      react: 0.9,
      typescript: 0.7,
      architecture: 0.7,
    },
  },
  ozon: {
    label: "Ozon Frontend",
    skills: {
      javascript: 1.2,
      async: 1,
      react: 1.2,
      typescript: 1,
      algorithms: 0.9,
      architecture: 0.9,
      testing: 0.8,
    },
  },
};

const serializeEvidence = (event: Record<string, unknown>): EvidenceEventContract => ({
  eventId: String(event.eventId),
  operationId: String(event.operationId),
  ontologyVersion: SKILL_ONTOLOGY_VERSION,
  source: event.source as EvidenceEventContract["source"],
  observations: event.observations as EvidenceEventContract["observations"],
  transferLevel: event.transferLevel as EvidenceEventContract["transferLevel"],
  assistance: event.assistance as EvidenceEventContract["assistance"],
  evaluator: event.evaluator as EvidenceEventContract["evaluator"],
  occurredAt: new Date(event.occurredAt as Date | string).toISOString(),
});

@Injectable()
export class MasteryService {
  constructor(
    private readonly evidenceService: EvidenceService,
    @InjectModel(MasterySnapshot.name)
    private readonly snapshotModel: Model<MasterySnapshot>,
    private readonly masteryV2: MasteryV2Service,
  ) {}

  async getOverview(
    targetId = "general",
    backfill = true,
    captureShadow = true,
  ): Promise<KnowledgeOverview> {
    if (backfill) await this.evidenceService.backfillMissing();
    const evidence = (await this.evidenceService.listAll())
      .map((event) => serializeEvidence(event as unknown as Record<string, unknown>));
    const skills = SKILL_ONTOLOGY.map((definition) =>
      buildSkillMastery(definition, evidence));
    const calculatedAt = new Date();
    if (skills.length) {
      await this.snapshotModel.bulkWrite(skills.map((mastery) => ({
        updateOne: {
          filter: {
            ontologyVersion: SKILL_ONTOLOGY_VERSION,
            masteryModelVersion: MASTERY_MODEL_VERSION,
            skillId: mastery.skillId,
          },
          update: {
            $set: { mastery, calculatedAt },
          },
          upsert: true,
        },
      })));
    }
    const overview = {
      ontologyVersion: SKILL_ONTOLOGY_VERSION,
      masteryModelVersion: MASTERY_MODEL_VERSION,
      generatedAt: new Date().toISOString(),
      readiness: this.buildTargetReadiness(targetId, skills),
      skills: skills.sort((left, right) => {
        if (left.estimate === null) return 1;
        if (right.estimate === null) return -1;
        return left.estimate - right.estimate;
      }),
    };
    if (captureShadow) await this.masteryV2.captureShadow(targetId);
    return overview;
  }

  async compareWithV2(targetId = "general"): Promise<MasteryShadowComparison> {
    const [v1, v2] = await Promise.all([
      this.getOverview(targetId, true, false),
      this.masteryV2.getOverview(targetId),
    ]);
    const delta = (left: number | null, right: number) => left === null ? null : right - left;
    return {
      targetId: v2.readiness.targetId,
      generatedAt: new Date().toISOString(),
      readiness: {
        v1Estimate: v1.readiness.estimate,
        v2Estimate: v2.readiness.estimate,
        estimateDelta: delta(v1.readiness.estimate, v2.readiness.estimate),
        v1Coverage: v1.readiness.coverage,
        v2Coverage: v2.readiness.coverage,
        v2TransferCoverage: v2.readiness.transferCoverage,
      },
      skills: v2.skills.map((skill) => {
        const legacy = v1.skills.find((item) => item.skillId === skill.skillId);
        return {
          skillId: skill.skillId,
          v1Estimate: legacy?.estimate ?? null,
          v2Estimate: skill.estimate,
          estimateDelta: delta(legacy?.estimate ?? null, skill.estimate),
          v2CapabilityCoverage: skill.capabilityCoverage,
          unknownCapabilities: skill.unknownCapabilities,
        };
      }),
    };
  }

  async getSkillDetail(skillId: string): Promise<SkillDetail> {
    await this.evidenceService.backfillMissing();
    const definition = getSkillDefinition(skillId);
    if (!definition) throw new NotFoundException("Навык не найден");
    const evidence = (await this.evidenceService.listForSkill(skillId))
      .map((event) => serializeEvidence(event as unknown as Record<string, unknown>));
    return {
      ontologyVersion: SKILL_ONTOLOGY_VERSION,
      definition,
      mastery: buildSkillMastery(definition, evidence),
      evidence,
    };
  }

  listSkills() {
    return { ontologyVersion: SKILL_ONTOLOGY_VERSION, skills: SKILL_ONTOLOGY };
  }

  private buildTargetReadiness(targetId: string, skills: SkillMastery[]) {
    const target = TARGETS[targetId] ?? TARGETS.general!;
    const selected = Object.entries(target.skills).map(([skillId, weight]) => ({
      mastery: skills.find((skill) => skill.skillId === skillId),
      weight,
    }));
    const measured = selected.filter(
      (item): item is { mastery: SkillMastery & { estimate: number; lower: number; upper: number }; weight: number } =>
        Boolean(item.mastery) &&
        typeof item.mastery?.estimate === "number" &&
        typeof item.mastery.lower === "number" &&
        typeof item.mastery.upper === "number",
    );
    const totalTargetWeight = selected.reduce((sum, item) => sum + item.weight, 0);
    const measuredWeight = measured.reduce((sum, item) => sum + item.weight, 0);
    const weighted = (key: "estimate" | "lower" | "upper") => measuredWeight
      ? Math.round(measured.reduce((sum, item) => sum + item.mastery[key] * item.weight, 0) / measuredWeight)
      : null;
    const evidenceCount = measured.reduce((sum, item) => sum + item.mastery.evidenceCount, 0);
    const noAiEvidenceCount = measured.reduce((sum, item) => sum + item.mastery.noAiEvidenceCount, 0);
    const confidence = measured.length > 0 && measured.every((item) => item.mastery.confidence === "high")
      ? "high"
      : measured.some((item) => item.mastery.confidence !== "low")
        ? "medium"
        : "low";
    return {
      targetId: TARGETS[targetId] ? targetId : "general",
      targetLabel: target.label,
      estimate: weighted("estimate"),
      lower: weighted("lower"),
      upper: weighted("upper"),
      coverage: totalTargetWeight ? Math.round((measuredWeight / totalTargetWeight) * 100) : 0,
      integrityCoverage: evidenceCount ? Math.round((noAiEvidenceCount / evidenceCount) * 100) : 0,
      evidenceCount,
      confidence,
    } as const;
  }
}
