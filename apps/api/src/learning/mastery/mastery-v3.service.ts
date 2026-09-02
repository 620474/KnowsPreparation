import { createHash, randomUUID } from "node:crypto";

import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import {
  ASSESSMENT_EVENT_V3_VERSION,
  MASTERY_MODEL_V3_VERSION,
  READINESS_MODEL_V8_VERSION,
  SKILL_ONTOLOGY_VERSION,
  assessmentEventV3Schema,
  knowledgeOverviewV3Schema,
  readinessCalibrationV2Schema,
  readinessOutcomeV2Schema,
  readinessSnapshotV2Schema,
  type KnowledgeOverviewV3,
  type ReadinessForecastV2,
  type SkillMasteryV3,
  type TargetProfileV2,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { EvidenceV3Service } from "../evidence/evidence-v3.service";
import { MasterySnapshotV3Entry } from "../schemas/mastery-snapshot-v3.schema";
import { ReadinessOutcomeV2Entry } from "../schemas/readiness-outcome-v2.schema";
import { ReadinessSnapshotV2Entry } from "../schemas/readiness-snapshot-v2.schema";
import { SKILL_ONTOLOGY, getSkillDefinition } from "../skills/skill-ontology";
import { TargetProfileService } from "../target-profile.service";
import { replaySkillMasteryV3 } from "./mastery-v3-calculator";

const CALIBRATOR_VERSION = "platt-eri-v1";
const CALIBRATION_MINIMUM = 20;

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

function fitCalibrator(points: Array<{ input: number; actual: number }>) {
  let intercept = 0;
  let slope = 1;
  for (let iteration = 0; iteration < 800; iteration += 1) {
    let interceptGradient = 0;
    let slopeGradient = 0;
    for (const point of points) {
      const centered = point.input - 0.5;
      const error = sigmoid(intercept + slope * centered) - point.actual;
      interceptGradient += error;
      slopeGradient += error * centered;
    }
    const divisor = Math.max(1, points.length);
    intercept -= 0.12 * interceptGradient / divisor;
    slope -= 0.12 * slopeGradient / divisor;
  }
  return { intercept, slope };
}

const predict = (model: { intercept: number; slope: number }, index: number) =>
  sigmoid(model.intercept + model.slope * (index / 100 - 0.5));

@Injectable()
export class MasteryV3Service {
  constructor(
    private readonly config: ConfigService,
    private readonly evidence: EvidenceV3Service,
    private readonly targets: TargetProfileService,
    @InjectModel(MasterySnapshotV3Entry.name)
    private readonly masterySnapshotModel: Model<MasterySnapshotV3Entry>,
    @InjectModel(ReadinessSnapshotV2Entry.name)
    private readonly readinessSnapshotModel: Model<ReadinessSnapshotV2Entry>,
    @InjectModel(ReadinessOutcomeV2Entry.name)
    private readonly outcomeModel: Model<ReadinessOutcomeV2Entry>,
  ) {}

  isEnabled() {
    return this.config.get<string>("MASTERY_V3_SHADOW") !== "false";
  }

  async getOverview(targetId = "general"): Promise<KnowledgeOverviewV3> {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException("Mastery v3 временно отключён");
    }
    await this.evidence.backfillV2();
    const [target, rawEvents] = await Promise.all([
      this.targets.get(targetId),
      this.evidence.listAll(),
    ]);
    const events = rawEvents.map((event) => assessmentEventV3Schema.parse({
      ...event,
      occurredAt: new Date(event.occurredAt).toISOString(),
    }));
    const now = new Date();
    const skills = SKILL_ONTOLOGY.map((definition) => replaySkillMasteryV3(definition, events, now));
    const preliminaryForecast = await this.buildForecast(targetId, null);
    const readiness = this.buildReadiness(target, skills, preliminaryForecast);
    const forecast = await this.buildForecast(targetId, readiness.evidenceReadiness.index);
    const overview = knowledgeOverviewV3Schema.parse({
      ontologyVersion: SKILL_ONTOLOGY_VERSION,
      evidenceVersion: ASSESSMENT_EVENT_V3_VERSION,
      masteryModelVersion: MASTERY_MODEL_V3_VERSION,
      readinessModelVersion: READINESS_MODEL_V8_VERSION,
      generatedAt: now.toISOString(),
      target,
      readiness: this.buildReadiness(target, skills, forecast),
      skills: skills.sort((left, right) => left.lower - right.lower),
    });
    await this.saveMasterySnapshot(overview, events.map((event) => event.eventId));
    return overview;
  }

  async getSkillDetail(skillId: string, targetId = "general") {
    await this.evidence.backfillV2();
    const definition = getSkillDefinition(skillId);
    if (!definition) throw new NotFoundException("Навык не найден");
    const events = (await this.evidence.listForSkill(skillId)).map((event) => assessmentEventV3Schema.parse({
      ...event,
      occurredAt: new Date(event.occurredAt).toISOString(),
    }));
    const overview = await this.getOverview(targetId);
    return {
      definition,
      mastery: overview.skills.find((skill) => skill.skillId === skillId)
        ?? replaySkillMasteryV3(definition, events),
      evidence: events,
    };
  }

  async freezeReadiness(targetId: string, applicationId: string | null) {
    this.assertReadinessEnabled();
    const overview = await this.getOverview(targetId);
    const snapshot = await this.readinessSnapshotModel.create({
      snapshotId: randomUUID(),
      targetId,
      applicationId,
      frozenAt: new Date(),
      overview,
      modelVersions: {
        ontology: SKILL_ONTOLOGY_VERSION,
        evidence: ASSESSMENT_EVENT_V3_VERSION,
        mastery: MASTERY_MODEL_V3_VERSION,
        readiness: READINESS_MODEL_V8_VERSION,
        calibrator: overview.readiness.interviewForecast.calibratorVersion,
      },
    });
    return this.serializeSnapshot(snapshot);
  }

  async recordOutcome(input: {
    snapshotId: string;
    company?: string | null;
    technicalPassed: boolean;
    codingPassed?: boolean | null;
    topics?: string[];
    notes?: string;
    occurredAt: string;
  }) {
    this.assertReadinessEnabled();
    const snapshot = await this.readinessSnapshotModel.findOne({ snapshotId: input.snapshotId }).lean().exec();
    if (!snapshot) throw new NotFoundException("Снимок готовности v8 не найден");
    const outcome = await this.outcomeModel.findOneAndUpdate(
      { snapshotId: input.snapshotId },
      {
        $set: {
          targetId: snapshot.targetId,
          company: input.company ?? snapshot.overview.target.company,
          technicalPassed: input.technicalPassed,
          codingPassed: input.codingPassed ?? null,
          topics: input.topics ?? [],
          notes: input.notes ?? "",
          occurredAt: new Date(input.occurredAt),
        },
        $setOnInsert: { outcomeId: randomUUID() },
      },
      { upsert: true, returnDocument: "after" },
    ).exec();
    return this.serializeOutcome(outcome);
  }

  async calibration(targetId = "general") {
    this.assertReadinessEnabled();
    const [snapshots, outcomes] = await Promise.all([
      this.readinessSnapshotModel.find({ targetId }).sort({ frozenAt: -1 }).limit(50).lean().exec(),
      this.outcomeModel.find({ targetId }).sort({ occurredAt: -1 }).limit(50).lean().exec(),
    ]);
    const forecast = await this.buildForecast(targetId, null, snapshots, outcomes);
    return readinessCalibrationV2Schema.parse({
      targetId,
      forecast,
      snapshots: snapshots.map((snapshot) => this.serializeSnapshot(snapshot)),
      outcomes: outcomes.map((outcome) => this.serializeOutcome(outcome)),
    });
  }

  private buildReadiness(target: TargetProfileV2, skills: SkillMasteryV3[], forecast: ReadinessForecastV2) {
    const selected = target.requirements.flatMap((requirement) => {
      const skill = skills.find((candidate) => candidate.skillId === requirement.skillId);
      if (!skill) return [];
      return requirement.capabilities.flatMap((capability) => {
        const mastery = skill.capabilities.find((candidate) => candidate.capability === capability);
        return mastery ? [{ requirement, mastery }] : [];
      });
    });
    const totalWeight = selected.reduce((sum, item) => sum + item.requirement.importance, 0);
    const geometric = (key: "posteriorMean" | "lower" | "upper") => totalWeight
      ? Math.exp(selected.reduce((sum, item) => {
          const value = Math.max(1, item.mastery[key]);
          return sum + item.requirement.importance * Math.log(value / 100);
        }, 0) / totalWeight) * 100
      : 0;
    const coverage = totalWeight
      ? selected.reduce((sum, item) => sum + item.requirement.importance * (item.mastery.evidenceCount > 0 ? 100 : 0), 0) / totalWeight
      : 0;
    const blockers = selected
      .filter((item) => item.requirement.required && (item.mastery.evidenceCount === 0 || item.mastery.lower < 55))
      .slice(0, 6)
      .map((item) => `${item.requirement.skillId}: ${item.mastery.capability}`);
    const lower = geometric("lower");
    const upper = geometric("upper");
    const decision = lower >= 70 && coverage >= 80 && blockers.length === 0
      ? "ready" as const
      : upper < 60
        ? "not_ready" as const
        : "uncertain" as const;
    return {
      targetId: target.targetId,
      targetLabel: target.label,
      evidenceReadiness: {
        index: Math.round(geometric("posteriorMean")),
        lower: Math.round(lower),
        upper: Math.round(upper),
        coverage: Math.round(coverage),
      },
      interviewForecast: forecast,
      decision,
      blockers,
    };
  }

  private assertReadinessEnabled() {
    if (this.config.get<string>("READINESS_V8_ENABLED") === "false") {
      throw new ServiceUnavailableException("Readiness v8 временно отключён");
    }
  }

  private async buildForecast(
    targetId: string,
    index: number | null,
    prefetchedSnapshots?: Array<ReadinessSnapshotV2Entry>,
    prefetchedOutcomes?: Array<ReadinessOutcomeV2Entry>,
  ): Promise<ReadinessForecastV2> {
    const snapshots = prefetchedSnapshots ?? await this.readinessSnapshotModel.find({ targetId }).lean().exec();
    const outcomes = prefetchedOutcomes ?? await this.outcomeModel.find({ targetId }).lean().exec();
    const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]));
    const points = outcomes.flatMap((outcome) => {
      const snapshot = snapshotById.get(outcome.snapshotId);
      return snapshot ? [{
        input: snapshot.overview.readiness.evidenceReadiness.index / 100,
        actual: outcome.technicalPassed ? 1 : 0,
      }] : [];
    });
    const status = points.length >= CALIBRATION_MINIMUM
      ? "calibrated" as const
      : points.length >= 8
        ? "provisional" as const
        : "insufficient_outcomes" as const;
    const model = points.length >= CALIBRATION_MINIMUM ? fitCalibrator(points) : null;
    const probability = model && index !== null ? predict(model, index) : null;
    const brierScore = model && points.length
      ? points.reduce((sum, point) => sum + (predict(model, point.input * 100) - point.actual) ** 2, 0) / points.length
      : null;
    return {
      probability,
      lower: probability === null ? null : Math.max(0, probability - 0.15),
      upper: probability === null ? null : Math.min(1, probability + 0.15),
      status,
      calibratorVersion: model ? CALIBRATOR_VERSION : null,
      outcomeCount: points.length,
      brierScore: brierScore === null ? null : Math.round(brierScore * 1_000) / 1_000,
    };
  }

  private async saveMasterySnapshot(overview: KnowledgeOverviewV3, eventIds: string[]) {
    const snapshotId = createHash("sha256")
      .update(JSON.stringify({ targetId: overview.target.targetId, eventIds }))
      .digest("hex");
    await this.masterySnapshotModel.updateOne(
      { snapshotId },
      { $setOnInsert: {
        snapshotId,
        targetId: overview.target.targetId,
        asOf: new Date(overview.generatedAt),
        evidenceEventCount: eventIds.length,
        overview,
      } },
      { upsert: true },
    ).exec();
  }

  private serializeSnapshot(value: ReadinessSnapshotV2Entry & { frozenAt: Date }) {
    return readinessSnapshotV2Schema.parse({
      snapshotId: value.snapshotId,
      targetId: value.targetId,
      applicationId: value.applicationId ?? null,
      frozenAt: value.frozenAt.toISOString(),
      readiness: value.overview.readiness,
      modelVersions: value.modelVersions,
    });
  }

  private serializeOutcome(value: ReadinessOutcomeV2Entry & { occurredAt: Date; createdAt: Date }) {
    return readinessOutcomeV2Schema.parse({
      outcomeId: value.outcomeId,
      snapshotId: value.snapshotId,
      targetId: value.targetId,
      company: value.company ?? null,
      technicalPassed: value.technicalPassed,
      codingPassed: value.codingPassed ?? null,
      topics: value.topics,
      notes: value.notes,
      occurredAt: value.occurredAt.toISOString(),
      createdAt: value.createdAt.toISOString(),
    });
  }
}
