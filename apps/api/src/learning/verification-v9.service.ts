import { createHash, randomUUID } from "node:crypto";

import { ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import {
  ASSESSMENT_EVENT_V4_VERSION,
  READINESS_V9_VERSION,
  assessmentEventV4Schema,
  checkpointAttemptResultSchema,
  checkpointSessionV1Schema,
  decisionPlanV9Schema,
  interviewOutcomeV4InputSchema,
  interviewOutcomeV4Schema,
  readinessV9Schema,
  type CheckpointAttemptResult,
  type CheckpointPublicItem,
  type DecisionPlanV9,
  type ReadinessV9,
  type SkillCapabilityV3,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { QUESTION_BANK } from "./curriculum";
import { ASSESSMENT_MANIFEST, getAssessmentManifestEntry, type AssessmentManifestEntry } from "./assessment-manifest";
import type { SubmitCheckpointAttemptV9Dto } from "./dto/learning.dto";
import { runPracticeSolution } from "./generated-runner";
import { MasteryV3Service } from "./mastery/mastery-v3.service";
import { getQuestionTraining } from "./question-training";
import { AssessmentEventV4Entry } from "./schemas/assessment-event-v4.schema";
import { CheckpointSessionEntry } from "./schemas/checkpoint-session.schema";
import { InterviewOutcomeV3Entry } from "./schemas/interview-outcome-v3.schema";
import { ItemExposureEntry } from "./schemas/item-exposure.schema";
import { ReadinessSnapshotV3Entry } from "./schemas/readiness-snapshot-v3.schema";
import { TargetProfileService } from "./target-profile.service";

const normalize = (value: string) => value.toLowerCase().replace(/[\s,;]+/g, "").trim();
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const contentHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const DAY_MS = 86_400_000;
const VERIFICATION_HALF_LIFE_DAYS = 45;
const REVERIFY_AFTER_DAYS = 60;

@Injectable()
export class VerificationV9Service {
  private readonly logger = new Logger(VerificationV9Service.name);

  constructor(
    private readonly config: ConfigService,
    private readonly targets: TargetProfileService,
    private readonly learningMastery: MasteryV3Service,
    @InjectModel(AssessmentEventV4Entry.name) private readonly events: Model<AssessmentEventV4Entry>,
    @InjectModel(ItemExposureEntry.name) private readonly exposures: Model<ItemExposureEntry>,
    @InjectModel(CheckpointSessionEntry.name) private readonly sessions: Model<CheckpointSessionEntry>,
    @InjectModel(ReadinessSnapshotV3Entry.name) private readonly snapshots: Model<ReadinessSnapshotV3Entry>,
    @InjectModel(InterviewOutcomeV3Entry.name) private readonly outcomes: Model<InterviewOutcomeV3Entry>,
  ) {}

  async createCheckpoint(targetId: string, availableMinutes: number) {
    this.assertEnabled();
    const target = await this.targets.get(targetId);
    const exposureRows = await this.exposures.find({ targetId }).lean().exec();
    const exposureByItem = new Map(exposureRows.map((item) => [item.itemId, item]));
    const candidates = ASSESSMENT_MANIFEST.flatMap((manifest) => {
      const question = QUESTION_BANK.find((item) => item.id === manifest.itemId);
      const training = getQuestionTraining(manifest.itemId);
      if (!question || !training || training.evaluator.mode === "ai") return [];
      const relevant = manifest.observations.some((observation) => target.requirements.some((requirement) =>
        observation.skillId === requirement.skillId
          || observation.skillId.startsWith(`${requirement.skillId}.`)
          || requirement.skillId.startsWith(`${observation.skillId}.`)));
      if (!relevant) return [];
      return [{ question, training, attempts: exposureByItem.get(question.id)?.attemptCount ?? 0 }];
    }).sort((left, right) => left.attempts - right.attempts || left.question.number - right.question.number);
    const itemCount = Math.max(2, Math.min(12, Math.floor(availableMinutes / 3)));
    const selected = candidates.slice(0, itemCount);
    if (!selected.length) throw new NotFoundException("Для этой цели пока нет проверяемых заданий");
    const now = new Date();
    const session = await this.sessions.create({
      sessionId: randomUUID(),
      targetId,
      status: "active",
      revision: 0,
      availableMinutes,
      reservedItemIds: selected.map((item) => item.question.id),
      currentItemId: null,
      activeLease: null,
      attempts: [],
      startedAt: now,
      completedAt: null,
    });
    return this.serializeSession(session.toObject());
  }

  async getCheckpoint(sessionId: string) {
    const session = await this.sessions.findOne({ sessionId }).lean().exec();
    if (!session) throw new NotFoundException("Контрольная сессия не найдена");
    return this.serializeSession(session);
  }

  async nextItem(sessionId: string) {
    this.assertEnabled();
    const session = await this.sessions.findOne({ sessionId }).lean().exec();
    if (!session) throw new NotFoundException("Контрольная сессия не найдена");
    if (session.status !== "active") return this.serializeSession(session);
    if (session.activeLease) return this.serializeSession(session);
    const completed = new Set(session.attempts.map((attempt) => attempt.itemId));
    const nextId = session.currentItemId ?? session.reservedItemIds.find((itemId) => !completed.has(itemId));
    if (!nextId) return this.completeCheckpoint(sessionId);
    const manifest = this.requireManifest(nextId);
    const now = new Date();
    const deadlineAt = new Date(now.getTime() + this.timeLimitMs(nextId));
    const lease = { leaseId: randomUUID(), itemId: nextId, leasedAt: now, deadlineAt };
    const claimed = await this.sessions.findOneAndUpdate(
      { sessionId, status: "active", activeLease: null, currentItemId: session.currentItemId ?? null },
      { $set: { activeLease: lease, currentItemId: nextId }, $inc: { revision: 1 } },
      { returnDocument: "after" },
    ).lean().exec();
    if (!claimed) return this.getCheckpoint(sessionId);
    this.logger.log({ event: "checkpoint_item_leased", sessionId, targetId: session.targetId, leaseId: lease.leaseId, itemId: nextId, revision: claimed.revision });
    const itemHash = this.manifestContentHash(manifest);
    await this.exposures.updateOne(
      { targetId: session.targetId, itemId: nextId, viewedLeaseIds: { $ne: lease.leaseId } },
      {
        $setOnInsert: {
          itemId: nextId, targetId: session.targetId, familyId: manifest.conceptFamilyId,
          conceptFamilyId: manifest.conceptFamilyId, formFamilyId: manifest.formFamilyId,
          formId: manifest.formId, contextFamilyId: manifest.contextFamilyId, contentHash: itemHash,
          attemptCount: 0, answerRevealed: false, firstSeenAt: now, attemptedOperationIds: [],
        },
        $set: { lastSeenAt: now },
        $addToSet: { viewedLeaseIds: lease.leaseId },
        $inc: { viewCount: 1 },
      },
      { upsert: true },
    ).exec();
    return this.serializeSession(claimed);
  }

  async submitAttempt(sessionId: string, dto: SubmitCheckpointAttemptV9Dto): Promise<CheckpointAttemptResult> {
    this.assertEnabled();
    this.assertFlag("EVIDENCE_V4_DUAL_WRITE", "Evidence v4 временно отключён");
    const existingEvent = await this.events.findOne({ operationId: dto.operationId }).lean().exec();
    if (existingEvent) {
      if (existingEvent.sessionId !== sessionId || !existingEvent.result) throw new ConflictException("operationId уже использован");
      const storedResult = checkpointAttemptResultSchema.parse(existingEvent.result);
      await this.reconcileAttempt(sessionId, existingEvent.targetId, dto.operationId, existingEvent.itemRef.itemId, existingEvent.eventId, storedResult);
      return storedResult;
    }
    const session = await this.sessions.findOne({ sessionId }).lean().exec();
    if (!session || session.status !== "active" || !session.currentItemId) {
      throw new ConflictException("В сессии нет активного задания");
    }
    const lease = session.activeLease;
    if (!lease || lease.leaseId !== dto.leaseId || lease.itemId !== session.currentItemId) throw new ConflictException("Lease задания устарел");
    const duplicate = session.attempts.find((attempt) => attempt.operationId === dto.operationId);
    if (duplicate) return checkpointAttemptResultSchema.parse(duplicate.result);
    const question = QUESTION_BANK.find((item) => item.id === session.currentItemId);
    const training = question && getQuestionTraining(question.id);
    if (!question || !training || training.evaluator.mode === "ai") throw new NotFoundException("Задание недоступно");
    const manifest = this.requireManifest(question.id);
    const exposure = await this.exposures.findOne({ targetId: session.targetId, itemId: question.id }).lean().exec();
    const priorAttempts = exposure?.attemptCount ?? 0;
    const seenBefore = (exposure?.viewedLeaseIds ?? []).some((leaseId) => leaseId !== dto.leaseId);
    let passed = false;
    let score = 0;
    let expectedAnswer: string | null = null;
    let feedback: string[] = [];
    if (training.evaluator.mode === "exact") {
      expectedAnswer = training.evaluator.expected;
      passed = normalize(dto.answer) === normalize(expectedAnswer);
      score = passed ? 100 : 0;
      feedback = [training.evaluator.explanation];
    } else if (training.evaluator.mode === "choice") {
      expectedAnswer = training.exercise.choices?.[training.evaluator.correctIndex] ?? null;
      passed = dto.selectedOptionIndex === training.evaluator.correctIndex;
      score = passed ? 100 : 0;
      feedback = [training.evaluator.explanation];
    } else {
      const execution = await runPracticeSolution(training.evaluator.runner, dto.answer);
      passed = execution.passed;
      score = execution.totalCount ? Math.round(execution.passedCount / execution.totalCount * 100) : 0;
      expectedAnswer = training.evaluator.referenceSolution;
      feedback = [
        ...execution.tests.filter((test) => !test.passed).map((test) => test.error ?? `Не пройдено: ${test.title}`),
        training.evaluator.explanation,
      ];
    }
    const receivedAt = new Date();
    const timingFailed = receivedAt.getTime() > new Date(lease.deadlineAt).getTime();
    const eligibility = timingFailed || dto.confidenceAfter === undefined
      ? "incomplete" as const
      : priorAttempts > 0 ? "repeated" as const : seenBefore ? "exposed" as const : "eligible" as const;
    const item = this.getPublicItem(question.id, lease);
    const result = checkpointAttemptResultSchema.parse({
      eventId: randomUUID(), itemId: question.id, passed, score, submittedAnswer: dto.answer,
      submittedExplanation: dto.explanation?.trim() || null, expectedAnswer, feedback,
      verificationEligibility: eligibility, confidenceGap: (dto.confidenceAfter ?? dto.confidenceBefore) - score,
    });
    const event = assessmentEventV4Schema.parse({
      eventId: result.eventId, operationId: dto.operationId, schemaVersion: ASSESSMENT_EVENT_V4_VERSION,
      targetId: session.targetId, sessionId, mode: "checkpoint", verificationEligibility: eligibility,
      itemRef: {
        itemId: item.itemId, familyId: manifest.conceptFamilyId, conceptFamilyId: manifest.conceptFamilyId,
        formFamilyId: manifest.formFamilyId, formId: manifest.formId, contextFamilyId: manifest.contextFamilyId,
        contentHash: this.manifestContentHash(manifest), contentRevision: manifest.contentRevision,
        difficultyBand: manifest.difficulty, novelty: manifest.novelty,
      },
      conditions: {
        aiAllowed: false, aiUsed: false, hintCount: 0, timed: true, timeLimitMs: item.timeLimitMs,
        deviceClass: dto.deviceClass, leasedAtServer: new Date(lease.leasedAt).toISOString(),
        deadlineAtServer: new Date(lease.deadlineAt).toISOString(), receivedAtServer: receivedAt.toISOString(),
      },
      process: { durationMs: receivedAt.getTime() - new Date(lease.leasedAt).getTime(), runCount: dto.runCount, failedTestCount: dto.failedTestCount, revisionCount: dto.revisionCount },
      selfAssessment: { confidenceBefore: dto.confidenceBefore, confidenceAfter: dto.confidenceAfter ?? null },
      observations: manifest.observations.map((observation) => ({
        criterionId: observation.criterionId, skillId: observation.skillId, capability: observation.capability,
        score, reliability: observation.weight, difficulty: manifest.difficulty, rubricVersion: "assessment-manifest-v1",
      })),
      integrity: { valid: !timingFailed, reasonCodes: timingFailed ? ["deadline_exceeded"] : [], networkInterrupted: dto.networkInterrupted },
      evaluator: { type: "deterministic", version: "checkpoint-v9-deterministic-1", model: null },
      provenance: { kind: "native", sourceEventId: null }, occurredAt: new Date().toISOString(),
    });
    try {
      await this.events.create({ ...event, result, occurredAt: new Date(event.occurredAt) });
    } catch (cause) {
      const duplicate = await this.events.findOne({ operationId: dto.operationId }).lean().exec();
      if (!duplicate?.result || duplicate.sessionId !== sessionId) throw cause;
      const duplicateResult = checkpointAttemptResultSchema.parse(duplicate.result);
      await this.reconcileAttempt(sessionId, session.targetId, dto.operationId, question.id, duplicate.eventId, duplicateResult);
      return duplicateResult;
    }
    await this.reconcileAttempt(sessionId, session.targetId, dto.operationId, question.id, event.eventId, result);
    this.logger.log({ event: "checkpoint_attempt_accepted", sessionId, operationId: dto.operationId, eventId: event.eventId, eligibility, reasonCodes: event.integrity.reasonCodes });
    return result;
  }

  async completeCheckpoint(sessionId: string) {
    await this.sessions.updateOne(
      { sessionId, status: "active" },
      { $set: { status: "completed", currentItemId: null, activeLease: null, completedAt: new Date() }, $inc: { revision: 1 } },
    ).exec();
    return this.getCheckpoint(sessionId);
  }

  async abortCheckpoint(sessionId: string) {
    await this.sessions.updateOne(
      { sessionId, status: "active" },
      { $set: { status: "aborted", currentItemId: null, activeLease: null, completedAt: new Date() }, $inc: { revision: 1 } },
    ).exec();
    return this.getCheckpoint(sessionId);
  }

  async readiness(targetId = "general"): Promise<ReadinessV9> {
    this.assertFlag("READINESS_V9_EXPOSE", "Readiness v9 временно отключён");
    const [target, learning, rawEvents] = await Promise.all([
      this.targets.get(targetId), this.learningMastery.getOverview(targetId), this.events.find({ targetId }).sort({ occurredAt: 1 }).lean().exec(),
    ]);
    const events = rawEvents.map((event) => assessmentEventV4Schema.parse({ ...event, occurredAt: new Date(event.occurredAt).toISOString() }));
    const now = Date.now();
    const capabilities = target.requirements.flatMap((requirement) => requirement.capabilities.map((capability) => {
      const matching = events.flatMap((event) => event.observations
        .filter((item) => this.skillMatches(requirement.skillId, item.skillId) && item.capability === capability)
        .map((observation) => ({ event, observation })));
      const eligible = matching.filter(({ event }) => event.verificationEligibility === "eligible" && event.integrity.valid);
      const independent = new Map<string, (typeof eligible)[number]>();
      eligible.forEach((entry) => {
        const key = `${entry.event.itemRef.conceptFamilyId}:${entry.event.itemRef.contextFamilyId}:${entry.event.itemRef.formId}`;
        const current = independent.get(key);
        if (!current || new Date(current.event.occurredAt).getTime() < new Date(entry.event.occurredAt).getTime()) independent.set(key, entry);
      });
      const observations = [...independent.values()];
      const forms = new Set(observations.map(({ event }) => event.itemRef.formFamilyId)).size;
      const contexts = new Set(observations.map(({ event }) => event.itemRef.contextFamilyId)).size;
      let alpha = 1;
      let beta = 1;
      let effectiveEvidenceCount = 0;
      observations.forEach(({ event, observation }) => {
        const ageDays = Math.max(0, (now - new Date(event.occurredAt).getTime()) / DAY_MS);
        const freshness = Math.pow(0.5, ageDays / VERIFICATION_HALF_LIFE_DAYS);
        const difficultyWeight = 0.7 + observation.difficulty * 0.12;
        const weight = observation.reliability * freshness * difficultyWeight;
        const success = observation.score / 100;
        alpha += success * weight;
        beta += (1 - success) * weight;
        effectiveEvidenceCount += weight;
      });
      const mean = observations.length ? alpha / (alpha + beta) : null;
      const variance = mean === null ? null : alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1));
      const lower = mean === null || variance === null ? null : Math.max(0, mean - 1.96 * Math.sqrt(variance));
      const upper = mean === null || variance === null ? null : Math.min(1, mean + 1.96 * Math.sqrt(variance));
      const latestAt = observations.reduce<string | null>((latest, entry) => !latest || entry.event.occurredAt > latest ? entry.event.occurredAt : latest, null);
      const latestAgeDays = latestAt ? (now - new Date(latestAt).getTime()) / DAY_MS : Number.POSITIVE_INFINITY;
      const requiresTransfer = capability === "design" || capability === "defend" || capability === "transfer";
      const lowScores = observations.filter(({ observation }) => observation.score < 40).length;
      const reasonCodes: string[] = [];
      let status: ReadinessV9["capabilities"][number]["status"] = "unknown";
      if (!observations.length && matching.length) {
        status = "learning";
        reasonCodes.push("only_noneligible_evidence");
      } else if (observations.length) {
        if (lowScores >= 2) {
          status = "blocked";
          reasonCodes.push("repeated_low_score");
        } else if (latestAgeDays > REVERIFY_AFTER_DAYS) {
          status = "stale";
          reasonCodes.push("evidence_stale");
        } else if (forms >= 2 && (!requiresTransfer || contexts >= 2) && (mean ?? 0) >= 0.7 && (lower ?? 0) >= 0.45 && effectiveEvidenceCount >= 1.5) {
          status = "verified";
        } else {
          status = "fragile";
          if (forms < 2) reasonCodes.push("needs_independent_form");
          if (requiresTransfer && contexts < 2) reasonCodes.push("needs_transfer_context");
          if ((lower ?? 0) < 0.45) reasonCodes.push("wide_uncertainty");
        }
      } else {
        reasonCodes.push("no_evidence");
      }
      return {
        skillId: requirement.skillId, capability, status,
        score: mean === null ? null : Math.round(mean * 100),
        lower: lower === null ? null : Math.round(lower * 100),
        upper: upper === null ? null : Math.round(upper * 100),
        eligibleEvidenceCount: observations.length, effectiveEvidenceCount: Number(effectiveEvidenceCount.toFixed(2)),
        independentFormCount: forms, independentContextCount: contexts, lastVerifiedAt: latestAt,
        reverifyAfter: latestAt ? new Date(new Date(latestAt).getTime() + REVERIFY_AFTER_DAYS * DAY_MS).toISOString() : null,
        reasonCodes, importance: requirement.importance, required: requirement.required,
      };
    }));
    const totalWeight = capabilities.reduce((sum, item) => sum + item.importance, 0) || 1;
    const verifiedWeight = capabilities.filter((item) => item.status === "verified").reduce((sum, item) => sum + item.importance, 0);
    const verifiedCoverage = Math.round(verifiedWeight / totalWeight * 100);
    const verifiedTransferReadiness = Math.round(capabilities.reduce((sum, item) => sum + item.importance * (item.status === "verified" ? item.score ?? 0 : 0), 0) / totalWeight);
    const blockers = capabilities.filter((item) => item.required && item.status !== "verified").slice(0, 8).map((item) => `${item.skillId}: ${item.capability}`);
    const wrongConfident = events.filter((event) => event.selfAssessment.confidenceBefore >= 80 && average(event.observations.map((item) => item.score)) < 60).length;
    const stabilityFlags: ReadinessV9["stabilityFlags"] = [];
    if (wrongConfident >= 2) stabilityFlags.push("overconfident");
    if (capabilities.some((item) => item.status === "fragile" || item.status === "stale")) stabilityFlags.push("fragile");
    if (events.some((event) => event.verificationEligibility !== "eligible" && average(event.observations.map((item) => item.score)) >= 80) && verifiedCoverage < 40) stabilityFlags.push("memorization_risk");
    const status = verifiedCoverage >= 80 && blockers.length === 0 ? "ready" as const : events.length && verifiedTransferReadiness < 50 ? "not_ready" as const : "uncertain" as const;
    const forecast = learning.readiness.interviewForecast;
    return readinessV9Schema.parse({
      version: READINESS_V9_VERSION, targetId, targetLabel: target.label, generatedAt: new Date().toISOString(), status,
      learningMastery: learning.readiness.evidenceReadiness.index, verifiedTransferReadiness, verifiedCoverage, blockers, stabilityFlags,
      capabilities: capabilities.map((item) => ({
        skillId: item.skillId,
        capability: item.capability,
        status: item.status,
        score: item.score,
        lower: item.lower,
        upper: item.upper,
        eligibleEvidenceCount: item.eligibleEvidenceCount,
        effectiveEvidenceCount: item.effectiveEvidenceCount,
        independentFormCount: item.independentFormCount,
        independentContextCount: item.independentContextCount,
        lastVerifiedAt: item.lastVerifiedAt,
        reverifyAfter: item.reverifyAfter,
        reasonCodes: item.reasonCodes,
      })),
      interviewForecast: { probability: forecast.probability, lower: forecast.lower, upper: forecast.upper, status: forecast.status === "calibrated" ? "calibrated" : forecast.status === "provisional" ? "directionally_calibrated" : "experimental", outcomeCount: forecast.outcomeCount },
    });
  }

  async decision(targetId = "general", availableMinutes = 60) {
    this.assertFlag("DECISION_V9_ENABLED", "Decision Loop v9 временно отключён");
    const [readiness, target, activeSession] = await Promise.all([
      this.readiness(targetId), this.targets.get(targetId),
      this.sessions.findOne({ targetId, status: "active" }).sort({ updatedAt: -1 }).lean().exec(),
    ]);
    if (activeSession) return decisionPlanV9Schema.parse({
      targetId, generatedAt: new Date().toISOString(), sufficientForToday: false,
      actions: [{ actionId: activeSession.sessionId, kind: "checkpoint", title: "Продолжить независимую проверку", whyNow: "Незавершённая сессия уже содержит выданные задания и должна быть закрыта первой.", estimatedMinutes: Math.min(20, availableMinutes), expectedUncertaintyReduction: 35, stopIf: "Сессия завершена или явно отменена." }],
    });
    if (readiness.status === "ready" || availableMinutes < 5) return decisionPlanV9Schema.parse({ targetId, generatedAt: new Date().toISOString(), sufficientForToday: true, actions: [] });
    const blockerCapability = readiness.capabilities.find((item) => item.status !== "verified");
    const blocker = blockerCapability ? `${blockerCapability.skillId}: ${blockerCapability.capability}` : "неподтверждённый перенос знаний";
    const daysUntilInterview = target.interviewAt ? Math.ceil((new Date(target.interviewAt).getTime() - Date.now()) / DAY_MS) : null;
    const urgency = daysUntilInterview === null ? "Дата интервью не задана." : `До интервью ${Math.max(0, daysUntilInterview)} дн.`;
    const primaryKind: DecisionPlanV9["actions"][number]["kind"] = blockerCapability?.status === "unknown" ? "diagnostic"
      : blockerCapability?.status === "learning" || blockerCapability?.status === "blocked" ? "learn"
        : blockerCapability?.status === "stale" ? "review"
          : blockerCapability?.reasonCodes.includes("needs_transfer_context") ? "transfer" : "parallel_retest";
    const actions: DecisionPlanV9["actions"] = [{
      actionId: contentHash(`${targetId}:${primaryKind}:${blocker}`).slice(0, 24), kind: primaryKind,
      title: primaryKind === "diagnostic" ? "Диагностика без подсказок" : primaryKind === "learn" ? `Закрыть пробел: ${blocker}` : primaryKind === "review" ? `Обновить навык: ${blocker}` : primaryKind === "transfer" ? "Проверить перенос в новом контексте" : "Параллельная проверка",
      whyNow: `${urgency} Главный риск: ${blocker}.`, estimatedMinutes: Math.min(20, availableMinutes),
      expectedUncertaintyReduction: primaryKind === "diagnostic" ? 45 : 35, stopIf: "Получено независимое валидное свидетельство без подсказок.",
    }];
    if (daysUntilInterview !== null && daysUntilInterview <= 7 && availableMinutes >= 35) actions.push({
      actionId: contentHash(`${targetId}:mock:${target.interviewAt}`).slice(0, 24), kind: "mock", title: "Мок-интервью под таймер",
      whyNow: `${urgency} Нужна проверка устойчивости в формате реального интервью.`, estimatedMinutes: Math.min(45, availableMinutes - actions[0]!.estimatedMinutes),
      expectedUncertaintyReduction: 30, stopIf: "Пройдены платформа, код и защита решения без внешней помощи.",
    });
    return decisionPlanV9Schema.parse({ targetId, generatedAt: new Date().toISOString(), sufficientForToday: false, actions: actions.slice(0, 2) });
  }

  async freezeReadiness(targetId: string) {
    const readiness = await this.readiness(targetId);
    const row = await this.snapshots.create({ snapshotId: randomUUID(), targetId, readiness, frozenAt: new Date() });
    return { snapshotId: row.snapshotId, targetId, readiness, frozenAt: row.frozenAt.toISOString() };
  }

  async recordOutcome(input: unknown) {
    const parsed = interviewOutcomeV4InputSchema.parse(input);
    const snapshot = await this.snapshots.findOne({ snapshotId: parsed.snapshotId }).lean().exec();
    if (!snapshot) throw new NotFoundException("Снимок готовности v9 не найден");
    const existing = await this.outcomes.findOne({ operationId: parsed.operationId }).lean().exec();
    if (existing) return this.serializeOutcome(existing);
    const created = await this.outcomes.create({
      outcomeId: randomUUID(), ...parsed, targetId: snapshot.targetId,
      occurredAt: new Date(parsed.occurredAt),
    });
    return this.serializeOutcome(created.toObject());
  }

  async listOutcomes(targetId = "general") {
    const rows = await this.outcomes.find({ targetId }).sort({ occurredAt: -1 }).lean().exec();
    return rows.map((row) => this.serializeOutcome(row));
  }

  private serializeOutcome(value: InterviewOutcomeV3Entry) {
    return interviewOutcomeV4Schema.parse({
      outcomeId: value.outcomeId, operationId: value.operationId, snapshotId: value.snapshotId, targetId: value.targetId,
      company: value.company ?? null, role: value.role ?? null, stage: value.stage ?? "technical", result: value.result ?? "pending",
      questions: value.questions ?? [], feedback: value.feedback ?? null, occurredAt: new Date(value.occurredAt).toISOString(),
    });
  }

  private serializeSession(session: CheckpointSessionEntry): ReturnType<typeof checkpointSessionV1Schema.parse> {
    const lease = session.activeLease;
    return checkpointSessionV1Schema.parse({
      sessionId: session.sessionId, targetId: session.targetId, status: session.status, revision: session.revision ?? 0, availableMinutes: session.availableMinutes,
      totalItems: session.reservedItemIds.length, completedItems: session.attempts.length,
      currentItem: lease ? this.getPublicItem(lease.itemId, lease) : null,
      startedAt: new Date(session.startedAt).toISOString(), completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
    });
  }

  private getPublicItem(itemId: string, lease: { leaseId: string; leasedAt: Date; deadlineAt: Date }): CheckpointPublicItem {
    const question = QUESTION_BANK.find((item) => item.id === itemId);
    const training = question && getQuestionTraining(itemId);
    if (!question || !training) throw new NotFoundException("Задание не найдено");
    const manifest = this.requireManifest(itemId);
    return {
      itemId, leaseId: lease.leaseId, leaseStartedAt: new Date(lease.leasedAt).toISOString(), deadlineAt: new Date(lease.deadlineAt).toISOString(), assessmentKind: manifest.assessmentKind,
      category: question.category, prompt: question.prompt,
      capabilities: training.capabilities as SkillCapabilityV3[], difficultyBand: manifest.difficulty,
      timeLimitMs: training.exercise.expectedSeconds * 1_000,
      exercise: { type: training.exercise.type, instructions: training.exercise.instructions, code: training.exercise.code ?? null, starterCode: training.exercise.starterCode ?? null, choices: training.exercise.choices ?? [], requiresExplanation: training.exercise.requiresExplanation },
    };
  }

  private requireManifest(itemId: string) {
    const manifest = getAssessmentManifestEntry(itemId);
    if (!manifest) throw new NotFoundException("Метаданные проверочного задания не найдены");
    return manifest;
  }

  private timeLimitMs(itemId: string) {
    const training = getQuestionTraining(itemId);
    if (!training) throw new NotFoundException("Проверочное задание не найдено");
    return training.exercise.expectedSeconds * 1_000;
  }

  private manifestContentHash(manifest: AssessmentManifestEntry) {
    const question = QUESTION_BANK.find((item) => item.id === manifest.itemId);
    const training = getQuestionTraining(manifest.itemId);
    return contentHash({ manifest, prompt: question?.prompt, exercise: training?.exercise });
  }

  private skillMatches(requiredSkillId: string, observedSkillId: string) {
    return requiredSkillId === observedSkillId
      || observedSkillId.startsWith(`${requiredSkillId}.`)
      || requiredSkillId.startsWith(`${observedSkillId}.`);
  }

  private async reconcileAttempt(
    sessionId: string,
    targetId: string,
    operationId: string,
    itemId: string,
    eventId: string,
    result: CheckpointAttemptResult,
  ) {
    await Promise.all([
      this.sessions.updateOne(
        { sessionId, "attempts.operationId": { $ne: operationId } },
        {
          $push: { attempts: { operationId, itemId, eventId, score: result.score, result } },
          $set: { currentItemId: null, activeLease: null },
          $inc: { revision: 1 },
        },
      ).exec(),
      this.exposures.updateOne(
        { targetId, itemId, attemptedOperationIds: { $ne: operationId } },
        {
          $addToSet: { attemptedOperationIds: operationId },
          $set: { answerRevealed: true, lastSeenAt: new Date() },
          $inc: { attemptCount: 1 },
        },
      ).exec(),
    ]);
  }

  private assertEnabled() {
    this.assertFlag("CHECKPOINT_V9_ENABLED", "Verified Checkpoint временно отключён");
  }

  private assertFlag(name: string, message: string) {
    if (this.config.get<string>(name) === "false") throw new ServiceUnavailableException(message);
  }
}
