import { createHash, randomUUID } from "node:crypto";

import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import {
  ASSESSMENT_EVENT_V4_VERSION,
  READINESS_V9_VERSION,
  assessmentEventV4Schema,
  checkpointAttemptResultSchema,
  checkpointSessionV1Schema,
  decisionPlanV9Schema,
  readinessV9Schema,
  type CheckpointAttemptResult,
  type CheckpointPublicItem,
  type DecisionPlanV9,
  type ReadinessV9,
  type SkillCapabilityV3,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { QUESTION_BANK } from "./curriculum";
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

@Injectable()
export class VerificationV9Service {
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
    const exposureRows = await this.exposures.find().lean().exec();
    const exposureByItem = new Map(exposureRows.map((item) => [item.itemId, item]));
    const targetSkills = new Set(target.requirements.map((requirement) => requirement.skillId.split(".")[0]));
    const candidates = QUESTION_BANK.flatMap((question) => {
      const training = getQuestionTraining(question.id);
      if (!training || training.evaluator.mode === "ai") return [];
      if (!training.skillKeys.some((skill) => targetSkills.has(skill))) return [];
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
      availableMinutes,
      reservedItemIds: selected.map((item) => item.question.id),
      currentItemId: null,
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
    if (session.currentItemId) return this.serializeSession(session);
    const completed = new Set(session.attempts.map((attempt) => attempt.itemId));
    const nextId = session.reservedItemIds.find((itemId) => !completed.has(itemId));
    if (!nextId) return this.completeCheckpoint(sessionId);
    const item = this.getPublicItem(nextId);
    await Promise.all([
      this.sessions.updateOne({ sessionId, currentItemId: null }, { $set: { currentItemId: nextId } }).exec(),
      this.exposures.updateOne(
        { itemId: nextId },
        {
          $setOnInsert: { itemId: nextId, familyId: item.familyId, formId: item.formId, attemptCount: 0, answerRevealed: false, firstSeenAt: new Date() },
          $set: { lastSeenAt: new Date() },
          $inc: { viewCount: 1 },
        },
        { upsert: true },
      ).exec(),
    ]);
    return this.getCheckpoint(sessionId);
  }

  async submitAttempt(sessionId: string, dto: SubmitCheckpointAttemptV9Dto): Promise<CheckpointAttemptResult> {
    this.assertEnabled();
    this.assertFlag("EVIDENCE_V4_DUAL_WRITE", "Evidence v4 временно отключён");
    const session = await this.sessions.findOne({ sessionId }).lean().exec();
    if (!session || session.status !== "active" || !session.currentItemId) {
      throw new ConflictException("В сессии нет активного задания");
    }
    const duplicate = session.attempts.find((attempt) => attempt.operationId === dto.operationId);
    if (duplicate) return checkpointAttemptResultSchema.parse(duplicate.result);
    const question = QUESTION_BANK.find((item) => item.id === session.currentItemId);
    const training = question && getQuestionTraining(question.id);
    if (!question || !training || training.evaluator.mode === "ai") throw new NotFoundException("Задание недоступно");
    const exposure = await this.exposures.findOne({ itemId: question.id }).lean().exec();
    const priorAttempts = exposure?.attemptCount ?? 0;
    const seenBefore = (exposure?.viewCount ?? 1) > 1;
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
    const eligibility = priorAttempts > 0 ? "repeated" as const : seenBefore ? "exposed" as const : "eligible" as const;
    const item = this.getPublicItem(question.id);
    const event = assessmentEventV4Schema.parse({
      eventId: randomUUID(), operationId: dto.operationId, schemaVersion: ASSESSMENT_EVENT_V4_VERSION,
      targetId: session.targetId, sessionId, mode: "checkpoint", verificationEligibility: eligibility,
      itemRef: { itemId: item.itemId, familyId: item.familyId, formId: item.formId, contextFamilyId: question.category, contentHash: contentHash(item), difficultyBand: item.difficultyBand },
      conditions: { aiAllowed: false, aiUsed: false, hintCount: 0, timed: true, timeLimitMs: item.timeLimitMs, deviceClass: dto.deviceClass },
      process: { durationMs: dto.durationMs, runCount: dto.runCount, failedTestCount: dto.failedTestCount, revisionCount: dto.revisionCount },
      selfAssessment: { confidenceBefore: dto.confidenceBefore, confidenceAfter: dto.confidenceAfter ?? null },
      observations: training.skillKeys.flatMap((skillId) => training.capabilities.map((capability) => ({ skillId, capability, score, reliability: 1 }))),
      integrity: { valid: true, reasonCodes: [], networkInterrupted: dto.networkInterrupted },
      evaluator: { type: "deterministic", version: "checkpoint-v9-deterministic-1", model: null },
      provenance: { kind: "native", sourceEventId: null }, occurredAt: new Date().toISOString(),
    });
    const existingEvent = await this.events.findOne({ operationId: dto.operationId }).lean().exec();
    if (existingEvent) throw new ConflictException("operationId уже использован");
    await this.events.create({ ...event, occurredAt: new Date(event.occurredAt) });
    const result = checkpointAttemptResultSchema.parse({
      eventId: event.eventId, itemId: question.id, passed, score, submittedAnswer: dto.answer,
      submittedExplanation: dto.explanation?.trim() || null, expectedAnswer, feedback,
      verificationEligibility: eligibility, confidenceGap: dto.confidenceBefore - score,
    });
    await Promise.all([
      this.sessions.updateOne(
        { sessionId, currentItemId: question.id },
        { $push: { attempts: { operationId: dto.operationId, itemId: question.id, eventId: event.eventId, score, result } }, $set: { currentItemId: null } },
      ).exec(),
      this.exposures.updateOne(
        { itemId: question.id },
        { $inc: { attemptCount: 1 }, $set: { answerRevealed: true, lastSeenAt: new Date() } },
      ).exec(),
    ]);
    return result;
  }

  async completeCheckpoint(sessionId: string) {
    await this.sessions.updateOne(
      { sessionId, status: "active" },
      { $set: { status: "completed", currentItemId: null, completedAt: new Date() } },
    ).exec();
    return this.getCheckpoint(sessionId);
  }

  async abortCheckpoint(sessionId: string) {
    await this.sessions.updateOne(
      { sessionId, status: "active" },
      { $set: { status: "aborted", currentItemId: null, completedAt: new Date() } },
    ).exec();
    return this.getCheckpoint(sessionId);
  }

  async readiness(targetId = "general"): Promise<ReadinessV9> {
    this.assertFlag("READINESS_V9_EXPOSE", "Readiness v9 временно отключён");
    const [target, learning, rawEvents] = await Promise.all([
      this.targets.get(targetId), this.learningMastery.getOverview(targetId), this.events.find({ targetId }).sort({ occurredAt: 1 }).lean().exec(),
    ]);
    const events = rawEvents.map((event) => assessmentEventV4Schema.parse({ ...event, occurredAt: new Date(event.occurredAt).toISOString() }));
    const capabilities = target.requirements.flatMap((requirement) => requirement.capabilities.map((capability) => {
      const observations = events.flatMap((event) => event.observations
        .filter((item) => item.skillId === requirement.skillId && item.capability === capability)
        .map((item) => ({ event, observation: item })))
        .filter((item) => item.event.verificationEligibility === "eligible" && item.event.integrity.valid);
      const forms = new Set(observations.map((item) => item.event.itemRef.formId)).size;
      const score = observations.length ? average(observations.map((item) => item.observation.score)) : null;
      const status = forms >= 2 && (score ?? 0) >= 70 ? "verified" as const : forms >= 1 && (score ?? 0) >= 60 ? "fragile" as const : "insufficient" as const;
      return { skillId: requirement.skillId, capability, status, score, eligibleEvidenceCount: observations.length, independentFormCount: forms, lastVerifiedAt: observations.at(-1)?.event.occurredAt ?? null, importance: requirement.importance, required: requirement.required };
    }));
    const totalWeight = capabilities.reduce((sum, item) => sum + item.importance, 0) || 1;
    const verifiedWeight = capabilities.filter((item) => item.status === "verified").reduce((sum, item) => sum + item.importance, 0);
    const verifiedCoverage = Math.round(verifiedWeight / totalWeight * 100);
    const verifiedTransferReadiness = Math.round(capabilities.reduce((sum, item) => sum + item.importance * (item.status === "verified" ? item.score ?? 0 : 0), 0) / totalWeight);
    const blockers = capabilities.filter((item) => item.required && item.status !== "verified").slice(0, 8).map((item) => `${item.skillId}: ${item.capability}`);
    const wrongConfident = events.filter((event) => event.selfAssessment.confidenceBefore >= 80 && average(event.observations.map((item) => item.score)) < 60).length;
    const stabilityFlags: ReadinessV9["stabilityFlags"] = [];
    if (wrongConfident >= 2) stabilityFlags.push("overconfident");
    if (capabilities.some((item) => item.status === "fragile")) stabilityFlags.push("fragile");
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
        eligibleEvidenceCount: item.eligibleEvidenceCount,
        independentFormCount: item.independentFormCount,
        lastVerifiedAt: item.lastVerifiedAt,
      })),
      interviewForecast: { probability: forecast.probability, lower: forecast.lower, upper: forecast.upper, status: forecast.status === "calibrated" ? "calibrated" : forecast.status === "provisional" ? "directionally_calibrated" : "experimental", outcomeCount: forecast.outcomeCount },
    });
  }

  async decision(targetId = "general", availableMinutes = 60) {
    this.assertFlag("DECISION_V9_ENABLED", "Decision Loop v9 временно отключён");
    const readiness = await this.readiness(targetId);
    if (readiness.status === "ready" || availableMinutes < 5) return decisionPlanV9Schema.parse({ targetId, generatedAt: new Date().toISOString(), sufficientForToday: true, actions: [] });
    const blocker = readiness.blockers[0] ?? "неподтверждённый перенос знаний";
    const actions: DecisionPlanV9["actions"] = [{
      actionId: contentHash(`${targetId}:checkpoint:${blocker}`).slice(0, 24), kind: "checkpoint" as const,
      title: "Независимая проверка", whyNow: `Главный риск: ${blocker}.`, estimatedMinutes: Math.min(20, availableMinutes),
      expectedUncertaintyReduction: 35, stopIf: "Две независимые формы подтверждены без подсказок.",
    }];
    if (availableMinutes >= 35 && readiness.status === "not_ready") actions.push({
      actionId: contentHash(`${targetId}:intervention:${blocker}`).slice(0, 24), kind: "intervention" as const,
      title: `Разобрать пробел: ${blocker}`, whyNow: "Контрольная показала устойчивый пробел.", estimatedMinutes: 15,
      expectedUncertaintyReduction: 20, stopIf: "Механизм объяснён и готова параллельная проверка.",
    });
    return decisionPlanV9Schema.parse({ targetId, generatedAt: new Date().toISOString(), sufficientForToday: false, actions: actions.slice(0, 2) });
  }

  async freezeReadiness(targetId: string) {
    const readiness = await this.readiness(targetId);
    const row = await this.snapshots.create({ snapshotId: randomUUID(), targetId, readiness, frozenAt: new Date() });
    return { snapshotId: row.snapshotId, targetId, readiness, frozenAt: row.frozenAt.toISOString() };
  }

  async recordOutcome(input: { operationId: string; snapshotId: string; sections: Array<Record<string, unknown>>; notes?: string; occurredAt: string }) {
    const snapshot = await this.snapshots.findOne({ snapshotId: input.snapshotId }).lean().exec();
    if (!snapshot) throw new NotFoundException("Снимок готовности v9 не найден");
    const existing = await this.outcomes.findOne({ operationId: input.operationId }).lean().exec();
    if (existing) return existing;
    return this.outcomes.create({ outcomeId: randomUUID(), operationId: input.operationId, snapshotId: input.snapshotId, targetId: snapshot.targetId, sections: input.sections, notes: input.notes ?? "", occurredAt: new Date(input.occurredAt) });
  }

  private serializeSession(session: CheckpointSessionEntry): ReturnType<typeof checkpointSessionV1Schema.parse> {
    return checkpointSessionV1Schema.parse({
      sessionId: session.sessionId, targetId: session.targetId, status: session.status, availableMinutes: session.availableMinutes,
      totalItems: session.reservedItemIds.length, completedItems: session.attempts.length,
      currentItem: session.currentItemId ? this.getPublicItem(session.currentItemId) : null,
      startedAt: new Date(session.startedAt).toISOString(), completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
    });
  }

  private getPublicItem(itemId: string): CheckpointPublicItem {
    const question = QUESTION_BANK.find((item) => item.id === itemId);
    const training = question && getQuestionTraining(itemId);
    if (!question || !training) throw new NotFoundException("Задание не найдено");
    const familyId = `${training.skillKeys[0] ?? "frontend"}:${training.capabilities.join("-")}`;
    return {
      itemId, familyId, formId: itemId, category: question.category, prompt: question.prompt,
      capabilities: training.capabilities as SkillCapabilityV3[], difficultyBand: Math.min(5, Math.max(1, Math.ceil(question.number / 20))),
      timeLimitMs: training.exercise.expectedSeconds * 1_000,
      exercise: { type: training.exercise.type, instructions: training.exercise.instructions, code: training.exercise.code ?? null, starterCode: training.exercise.starterCode ?? null, choices: training.exercise.choices ?? [], requiresExplanation: training.exercise.requiresExplanation },
    };
  }

  private assertEnabled() {
    this.assertFlag("CHECKPOINT_V9_ENABLED", "Verified Checkpoint временно отключён");
  }

  private assertFlag(name: string, message: string) {
    if (this.config.get<string>(name) === "false") throw new ServiceUnavailableException(message);
  }
}
