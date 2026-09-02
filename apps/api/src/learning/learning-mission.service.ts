import { randomUUID } from "node:crypto";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import {
  learningMissionSchema,
  learningMissionsTodaySchema,
  transferAssessmentResultSchema,
  type AdaptivePlanItem,
  type LearningMissionAction,
  type LearningMissionEventType,
  type LearningMissionStatus,
  type SkillMasteryV2,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { AdaptivePlanService } from "./adaptive-plan.service";
import type { LearningMissionActionDto, SubmitTransferAssessmentDto } from "./dto/learning.dto";
import { EvidenceV2Service } from "./evidence/evidence-v2.service";
import { MasteryV2Service } from "./mastery/mastery-v2.service";
import {
  LearningMission,
  type LearningMissionDocument,
} from "./schemas/learning-mission.schema";
import { LearningMissionEventEntry } from "./schemas/learning-mission-event.schema";
import { TransferAssessmentAttempt } from "./schemas/transfer-assessment-attempt.schema";
import { getSkillDefinition } from "./skills/skill-ontology";
import {
  TRANSFER_LAB_SKILL_IDS,
  getTransferDefinition,
  getTransferDefinitionsForSkill,
} from "./transfer-lab";

const ACTIVE_STATUSES: LearningMissionStatus[] = [
  "diagnosed",
  "intervention",
  "immediate_verify",
  "consolidation",
  "delayed_verify",
  "reopened",
];

const iso = (value: Date | string | null | undefined) => value
  ? new Date(value).toISOString()
  : null;

const serializeMission = (mission: LearningMission | Record<string, unknown>) => {
  const value = mission as LearningMission & { createdAt: Date; updatedAt: Date };
  return learningMissionSchema.parse({
    ...value,
    dueAt: iso(value.dueAt),
    deferredUntil: iso(value.deferredUntil),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
    closedAt: iso(value.closedAt),
    baseline: {
      ...value.baseline,
      capturedAt: iso((value.baseline as { capturedAt: Date | string }).capturedAt),
    },
  });
};

const missionPriority = (skill: SkillMasteryV2) => {
  const uncertainty = skill.upper - skill.lower;
  return (100 - skill.estimate) + uncertainty + skill.unknownCapabilities.length * 15;
};

const normalizeTargetId = (targetId: string) =>
  (["general", "yandex", "ozon"] as readonly string[]).includes(targetId)
    ? targetId
    : "general";

export function resolveVerificationOutcome(
  fromStatus: Extract<LearningMissionStatus, "immediate_verify" | "delayed_verify">,
  passed: boolean,
  attemptCount: number,
  occurredAt: Date,
) {
  if (passed && fromStatus === "immediate_verify") {
    return {
      status: "consolidation" as const,
      eventType: "verification_passed" as const,
      dueAt: new Date(occurredAt.getTime() + 3 * 24 * 60 * 60 * 1000),
      closedAt: null,
      note: "Назначена независимая проверка через 3 дня.",
    };
  }
  if (passed) {
    return {
      status: "closed" as const,
      eventType: "closed" as const,
      dueAt: null,
      closedAt: occurredAt,
      note: "Навык подтверждён повторной проверкой.",
    };
  }
  if (fromStatus === "delayed_verify" || attemptCount >= 2) {
    return {
      status: "reopened" as const,
      eventType: "reopened" as const,
      dueAt: null,
      closedAt: null,
      note: "Требуется новая интервенция.",
    };
  }
  return {
    status: "immediate_verify" as const,
    eventType: "verification_failed" as const,
    dueAt: null,
    closedAt: null,
    note: "Можно выполнить вторую попытку проверки.",
  };
}

@Injectable()
export class LearningMissionService {
  constructor(
    private readonly config: ConfigService,
    private readonly adaptivePlan: AdaptivePlanService,
    private readonly mastery: MasteryV2Service,
    private readonly evidence: EvidenceV2Service,
    @InjectModel(LearningMission.name)
    private readonly missionModel: Model<LearningMission>,
    @InjectModel(LearningMissionEventEntry.name)
    private readonly eventModel: Model<LearningMissionEventEntry>,
    @InjectModel(TransferAssessmentAttempt.name)
    private readonly attemptModel: Model<TransferAssessmentAttempt>,
  ) {}

  isEnabled() {
    return this.config.get<string>("MISSION_V7_ENABLED") !== "false";
  }

  async getToday(targetId = "general") {
    targetId = normalizeTargetId(targetId);
    const now = new Date();
    if (!this.isEnabled()) {
      return learningMissionsTodaySchema.parse({ enabled: false, generatedAt: now.toISOString(), missions: [] });
    }
    await this.advanceDelayedVerifications(now);
    let active = await this.missionModel
      .find({ targetId, status: { $in: ACTIVE_STATUSES } })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    if (active.length < 3) {
      await this.createMissingMissions(targetId, 3 - active.length, now);
      active = await this.missionModel
        .find({ targetId, status: { $in: ACTIVE_STATUSES } })
        .sort({ createdAt: 1 })
        .lean()
        .exec();
    }
    const visible = active
      .filter((mission) => !mission.deferredUntil || mission.deferredUntil <= now)
      .slice(0, 3)
      .map(serializeMission);
    return learningMissionsTodaySchema.parse({
      enabled: true,
      generatedAt: now.toISOString(),
      missions: visible,
    });
  }

  async getMission(missionId: string) {
    await this.advanceDelayedVerifications(new Date(), missionId);
    const mission = await this.missionModel.findOne({ missionId }).lean().exec();
    if (!mission) throw new NotFoundException("Учебная миссия не найдена");
    return serializeMission(mission);
  }

  async applyAction(missionId: string, action: LearningMissionAction, dto: LearningMissionActionDto) {
    const existingEvent = await this.eventModel.findOne({ operationId: dto.operationId }).lean().exec();
    if (existingEvent) return this.getMission(existingEvent.missionId);
    const mission = await this.missionModel.findOne({ missionId }).exec();
    if (!mission) throw new NotFoundException("Учебная миссия не найдена");
    const fromStatus = mission.status;
    let eventType: LearningMissionEventType;
    let toStatus = fromStatus;
    let note = dto.note ?? "";

    if (action === "start") {
      if (fromStatus !== "diagnosed" && fromStatus !== "reopened") {
        throw new BadRequestException("Эту миссию уже начали");
      }
      toStatus = "intervention";
      eventType = "started";
    } else if (action === "complete_intervention") {
      if (fromStatus !== "intervention") {
        throw new BadRequestException("Сначала начни интервенцию");
      }
      toStatus = "immediate_verify";
      eventType = "intervention_completed";
    } else if (action === "defer") {
      const deferredUntil = dto.deferredUntil
        ? new Date(dto.deferredUntil)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (Number.isNaN(deferredUntil.getTime()) || deferredUntil <= new Date()) {
        throw new BadRequestException("Дата переноса должна быть в будущем");
      }
      mission.deferredUntil = deferredUntil;
      eventType = "deferred";
      note ||= `Отложено до ${deferredUntil.toISOString()}`;
    } else {
      if (!ACTIVE_STATUSES.includes(fromStatus)) {
        throw new BadRequestException("Миссия уже завершена");
      }
      toStatus = "skipped";
      mission.closedAt = new Date();
      eventType = "skipped";
    }

    mission.status = toStatus;
    if (action !== "defer") mission.deferredUntil = null;
    await mission.save();
    await this.recordEvent({
      missionId,
      operationId: dto.operationId,
      type: eventType,
      fromStatus,
      toStatus,
      note,
      occurredAt: new Date(),
    });
    return this.getMission(missionId);
  }

  async submitTransferAssessment(missionId: string, dto: SubmitTransferAssessmentDto) {
    const existing = await this.attemptModel.findOne({ operationId: dto.operationId }).lean().exec();
    if (existing) return transferAssessmentResultSchema.parse({
      ...existing,
      createdAt: iso(existing.createdAt),
    });
    const mission = await this.missionModel.findOne({ missionId }).exec();
    if (!mission) throw new NotFoundException("Учебная миссия не найдена");
    if (mission.status !== "immediate_verify" && mission.status !== "delayed_verify") {
      throw new BadRequestException("Сейчас миссия не ожидает проверку");
    }
    const item = mission.status === "delayed_verify"
      ? mission.delayedVerification
      : mission.verification;
    const definition = getTransferDefinition(item.id);
    if (!definition) throw new BadRequestException("Проверочное задание больше недоступно");
    const evaluation = definition.evaluate(dto.answer);
    const passed = evaluation.score >= 70;
    const occurredAt = new Date();
    const evidenceEventId = await this.evidence.recordNative({
      operationId: dto.operationId,
      source: {
        kind: "transfer_assessment",
        itemId: definition.item.id,
        itemVersion: "1",
        itemFamilyId: definition.item.familyId,
        track: null,
      },
      observations: [{
        criterionId: `transfer:${definition.item.format}`,
        rubricVersion: "transfer-lab-v1",
        skillId: mission.skillId,
        capability: mission.capability,
        score: evaluation.score,
        reliability: 0.9,
        weight: 1,
      }],
      transferLevel: definition.transferLevel,
      assistance: { mode: "no_ai", hintCount: 0, solutionViewed: false },
      evaluator: {
        type: "deterministic",
        evaluatorVersion: "transfer-lab-v1",
        model: null,
        promptVersion: null,
        schemaVersion: "1",
      },
      occurredAt,
    });
    const attemptId = randomUUID();
    const created = await this.attemptModel.create({
      attemptId,
      operationId: dto.operationId,
      missionId,
      itemId: item.id,
      answer: dto.answer,
      score: evaluation.score,
      passed,
      feedback: evaluation.feedback,
      confidence: dto.confidence,
      responseTimeMs: dto.responseTimeMs,
      evidenceEventId,
    });
    await this.applyVerificationResult(mission, passed, evidenceEventId, evaluation.score, occurredAt);
    return transferAssessmentResultSchema.parse({
      attemptId,
      missionId,
      itemId: item.id,
      score: evaluation.score,
      passed,
      feedback: evaluation.feedback,
      evidenceEventId,
      createdAt: created.createdAt.toISOString(),
    });
  }

  private async createMissingMissions(targetId: string, limit: number, now: Date) {
    if (limit <= 0) return;
    const [overview, plan, existing] = await Promise.all([
      this.mastery.getOverview(targetId),
      this.adaptivePlan.getToday(now),
      this.missionModel.find({ targetId }).sort({ createdAt: -1 }).limit(30).lean().exec(),
    ]);
    const activeSkillIds = new Set(
      existing.filter((mission) => ACTIVE_STATUSES.includes(mission.status)).map((mission) => mission.skillId),
    );
    const cooldown = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSkillIds = new Set(
      existing.filter((mission) => mission.createdAt >= cooldown).map((mission) => mission.skillId),
    );
    const candidates = overview.skills
      .filter((skill) => TRANSFER_LAB_SKILL_IDS.includes(skill.skillId))
      .filter((skill) => !activeSkillIds.has(skill.skillId) && !recentSkillIds.has(skill.skillId))
      .sort((left, right) => missionPriority(right) - missionPriority(left));

    for (const skill of candidates.slice(0, limit)) {
      const transferItems = getTransferDefinitionsForSkill(skill.skillId);
      if (transferItems.length < 2) continue;
      const definition = getSkillDefinition(skill.skillId);
      if (!definition) continue;
      const capability = transferItems[0]!.capability;
      const capabilityMastery = skill.capabilities.find((item) => item.capability === capability);
      const intervention = plan.items.find((item) => item.skillKeys.includes(definition.legacySkillKey as never))
        ?? plan.items[0]
        ?? this.fallbackIntervention(skill);
      const missionId = randomUUID();
      const baseline = {
        estimate: capabilityMastery?.estimate ?? null,
        lower: capabilityMastery?.lower ?? 0,
        upper: capabilityMastery?.upper ?? 100,
        evidenceCount: capabilityMastery?.evidenceCount ?? 0,
        capturedAt: now,
      };
      await this.missionModel.create({
        missionId,
        targetId,
        title: `${skill.label}: подтвердить ${this.capabilityLabel(capability)}`,
        reason: capabilityMastery?.estimate === null || !capabilityMastery
          ? "Для этой способности пока недостаточно независимых проверок."
          : `Текущая оценка ${Math.round(capabilityMastery.estimate)}%, диапазон ${Math.round(capabilityMastery.lower)}–${Math.round(capabilityMastery.upper)}%.`,
        skillId: skill.skillId,
        skillLabel: skill.label,
        capability,
        status: "diagnosed",
        baseline,
        objective: { minimumScore: 70, minimumReliability: 0.65, maximumVerificationAttempts: 2 },
        intervention,
        verification: transferItems[0]!.item,
        delayedVerification: transferItems[1]!.item,
        verificationAttempts: 0,
        verificationEvidenceIds: [],
        dueAt: null,
        deferredUntil: null,
        closedAt: null,
      });
      await this.recordEvent({
        missionId,
        operationId: `mission-created:${missionId}`,
        type: "created",
        fromStatus: null,
        toStatus: "diagnosed",
        note: "Миссия создана Decision Engine по данным Mastery v2.",
        occurredAt: now,
      });
    }
  }

  private fallbackIntervention(skill: SkillMasteryV2): AdaptivePlanItem {
    const definition = getSkillDefinition(skill.skillId);
    return {
      id: `mission-review:${skill.skillId}`,
      kind: "review",
      title: `Повторить: ${skill.label}`,
      reason: "Сначала восстанови модель темы, затем пройди независимую проверку.",
      minutes: 20,
      score: 100,
      skillKeys: definition ? [definition.legacySkillKey as never] : [],
      track: null,
      itemId: null,
      source: null,
    };
  }

  private async applyVerificationResult(
    mission: LearningMissionDocument,
    passed: boolean,
    evidenceEventId: string | null,
    score: number,
    occurredAt: Date,
  ) {
    const fromStatus = mission.status;
    if (fromStatus !== "immediate_verify" && fromStatus !== "delayed_verify") {
      throw new BadRequestException("Миссия не ожидает проверку");
    }
    mission.verificationAttempts += 1;
    if (evidenceEventId) mission.verificationEvidenceIds.push(evidenceEventId);
    const outcome = resolveVerificationOutcome(
      fromStatus,
      passed,
      mission.verificationAttempts,
      occurredAt,
    );
    mission.status = outcome.status;
    mission.dueAt = outcome.dueAt;
    mission.closedAt = outcome.closedAt;
    const note = `Transfer Lab: ${score}/100. ${outcome.note}`;
    await mission.save();
    await this.recordEvent({
      missionId: mission.missionId,
      operationId: `mission-verification:${mission.missionId}:${mission.verificationAttempts}`,
      type: outcome.eventType,
      fromStatus,
      toStatus: mission.status,
      note,
      occurredAt,
    });
  }

  private async advanceDelayedVerifications(now: Date, missionId?: string) {
    const due = await this.missionModel.find({
      ...(missionId ? { missionId } : {}),
      status: "consolidation",
      dueAt: { $lte: now },
    }).exec();
    for (const mission of due) {
      mission.status = "delayed_verify";
      mission.dueAt = null;
      await mission.save();
      await this.recordEvent({
        missionId: mission.missionId,
        operationId: `mission-delayed-due:${mission.missionId}:${mission.verificationAttempts}`,
        type: "delayed_verification_due",
        fromStatus: "consolidation",
        toStatus: "delayed_verify",
        note: "Настало время независимой отложенной проверки.",
        occurredAt: now,
      });
    }
  }

  private recordEvent(event: {
    missionId: string;
    operationId: string;
    type: LearningMissionEventType;
    fromStatus: LearningMissionStatus | null;
    toStatus: LearningMissionStatus;
    note: string;
    occurredAt: Date;
  }) {
    return this.eventModel.updateOne(
      { operationId: event.operationId },
      { $setOnInsert: { eventId: randomUUID(), ...event } },
      { upsert: true },
    ).exec();
  }

  private capabilityLabel(capability: string) {
    return ({
      recall: "воспроизведение",
      explain: "объяснение",
      apply: "применение",
      debug: "диагностику",
      code: "написание кода",
      defend: "защиту решения",
    } as Record<string, string>)[capability] ?? capability;
  }
}
