import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  EMPTY_RESEARCH_AGENT_DRAFT,
  applyResearchAgentRunSchema,
  startResearchAgentRunSchema,
  type ApplyResearchAgentRun,
  type ResearchAgentDraft,
  type ResearchAgentEvidenceDraft,
  type ResearchAgentMode,
  type ResearchAgentPhase,
  type ResearchAgentRun,
  type StartResearchAgentRun,
} from "@prep/contracts";
import type { Model } from "mongoose";

import { AiAgentService } from "../agents/ai-agent.service";
import { ResearchService } from "../learning/research.service";
import { ResearchClaimEntry } from "../learning/schemas/research-claim.schema";
import { ResearchEvidenceEntry } from "../learning/schemas/research-evidence.schema";
import { ResearchProject } from "../learning/schemas/research-project.schema";
import { ResearchAgentRunEntry } from "./schemas/research-agent-run.schema";
import { ResearchActionEntry } from "./schemas/research-action.schema";

const LEASE_MS = 120_000;
const HEARTBEAT_MS = 30_000;
const RECOVERY_INTERVAL_MS = 30_000;

const MODE_BUDGETS = {
  quick: {
    maximumModelCalls: 7,
    maximumSolCalls: 0,
    maximumSources: 8,
    maximumDurationMinutes: 10,
  },
  standard: {
    maximumModelCalls: 9,
    maximumSolCalls: 3,
    maximumSources: 16,
    maximumDurationMinutes: 30,
  },
  deep: {
    maximumModelCalls: 10,
    maximumSolCalls: 4,
    maximumSources: 20,
    maximumDurationMinutes: 60,
  },
} satisfies Record<ResearchAgentMode, ResearchAgentRunEntry["budget"]>;

class ResearchBudgetExceededError extends Error {}
class ResearchLeaseLostError extends Error {}

const isDuplicateKeyError = (error: unknown) =>
  Boolean(error && typeof error === "object" && "code" in error && error.code === 11_000);

interface ResearchRunLease {
  owner: string;
  epoch: number;
}

const cloneEmptyDraft = (): ResearchAgentDraft => ({
  protocol: { ...EMPTY_RESEARCH_AGENT_DRAFT.protocol },
  evidence: [],
  claims: [],
  citationAudits: [],
  contradictions: [],
  actions: [],
  summary: "",
  unresolvedGaps: [],
  stopReason: "",
});

const serializeRun = (run: ResearchAgentRunEntry): ResearchAgentRun => ({
  runId: run.runId,
  projectId: run.projectId,
  operationId: run.operationId,
  type: run.type,
  mode: run.mode,
  status: run.status,
  phase: run.phase,
  progress: run.progress,
  model: run.model,
  reviewModel: run.reviewModel,
  budget: run.budget,
  usage: run.usage,
  draft: {
    ...cloneEmptyDraft(),
    ...run.draft,
    citationAudits: run.draft.citationAudits ?? [],
    contradictions: run.draft.contradictions ?? [],
    actions: run.draft.actions ?? [],
  },
  logs: run.logs,
  error: run.error,
  appliedAt: run.appliedAt?.toISOString() ?? null,
  startedAt: run.startedAt?.toISOString() ?? null,
  createdAt: run.createdAt.toISOString(),
  updatedAt: run.updatedAt.toISOString(),
});

@Injectable()
export class ResearchAgentService implements OnModuleInit, OnModuleDestroy {
  private readonly controllers = new Map<string, AbortController>();
  private recoveryTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly aiAgent: AiAgentService,
    private readonly researchService: ResearchService,
    @InjectModel(ResearchAgentRunEntry.name)
    private readonly runModel: Model<ResearchAgentRunEntry>,
    @InjectModel(ResearchProject.name)
    private readonly projectModel: Model<ResearchProject>,
    @InjectModel(ResearchEvidenceEntry.name)
    private readonly evidenceModel: Model<ResearchEvidenceEntry>,
    @InjectModel(ResearchClaimEntry.name)
    private readonly claimModel: Model<ResearchClaimEntry>,
    @InjectModel(ResearchActionEntry.name)
    private readonly actionModel: Model<ResearchActionEntry>,
  ) {}

  onModuleInit() {
    setImmediate(() => void this.resumePendingRuns());
    this.recoveryTimer = setInterval(
      () => void this.resumePendingRuns(),
      RECOVERY_INTERVAL_MS,
    );
    this.recoveryTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
    for (const controller of this.controllers.values()) controller.abort();
    this.controllers.clear();
  }

  async startRun(projectId: string, value: unknown) {
    if (!this.aiAgent.enabled) {
      throw new ServiceUnavailableException("AI-агенты не настроены: добавь OPENAI_API_KEY.");
    }
    const input = this.parseStart(value);
    const project = await this.projectModel.findOne({ projectId }).exec();
    if (!project) throw new NotFoundException("Исследование не найдено");
    const existing = await this.runModel.findOne({ projectId, operationId: input.operationId }).exec();
    if (existing) return serializeRun(existing);
    const now = new Date().toISOString();
    const budget = { ...MODE_BUDGETS[input.mode], ...input.budget };
    let run: ResearchAgentRunEntry;
    try {
      run = await this.runModel.create({
        runId: randomUUID(),
        projectId,
        activeProjectId: projectId,
        operationId: input.operationId,
        type: input.type,
        mode: input.mode,
        status: "queued",
        phase: "queued",
        progress: 0,
        model: this.aiAgent.researchModel,
        reviewModel: this.aiAgent.researchReviewModel,
        budget,
        usage: {
          modelCalls: 0,
          solCalls: 0,
          sourcesDiscovered: 0,
          sourcesAccepted: 0,
          validatedClaims: 0,
        },
        draft: cloneEmptyDraft(),
        logs: [{ phase: "queued", message: "Исследование поставлено в очередь", at: now }],
        error: null,
        leaseUntil: null,
        leaseOwner: null,
        leaseEpoch: 0,
        applyOperationId: null,
        appliedAt: null,
        startedAt: new Date(),
        baseProjectUpdatedAt: project.updatedAt,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const duplicate = await this.runModel.findOne({
        projectId,
        operationId: input.operationId,
      }).exec();
      if (duplicate) return serializeRun(duplicate);
      throw new ConflictException("Исследовательский агент уже работает");
    }
    setImmediate(() => void this.executeRun(run.runId));
    return serializeRun(run);
  }

  async getLatestRun(projectId: string) {
    const run = await this.runModel.findOne({ projectId }).sort({ createdAt: -1 }).exec();
    return run ? serializeRun(run) : null;
  }

  async getRun(projectId: string, runId: string) {
    return serializeRun(await this.requireRun(projectId, runId));
  }

  async cancelRun(projectId: string, runId: string) {
    const run = await this.runModel.findOneAndUpdate(
      { projectId, runId, status: { $in: ["queued", "running"] } },
      {
        $set: {
          status: "cancelled",
          phase: "complete",
          error: null,
          leaseUntil: null,
          leaseOwner: null,
        },
        $unset: { activeProjectId: 1 },
        $push: {
          logs: {
            phase: "complete",
            message: "Исследование отменено пользователем",
            at: new Date().toISOString(),
          },
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!run) throw new ConflictException("Этот запуск уже нельзя отменить");
    this.controllers.get(runId)?.abort();
    return serializeRun(run);
  }

  async applyRun(projectId: string, runId: string, value: unknown) {
    const input = this.parseApply(value);
    const run = await this.requireRun(projectId, runId);
    if (run.status === "applied") {
      if (run.applyOperationId !== input.operationId) {
        throw new ConflictException("Результат уже применён другой операцией");
      }
      return this.researchService.getWorkspace(projectId);
    }
    if (run.status !== "review_ready" && run.status !== "partially_completed") {
      throw new ConflictException("Результат исследования ещё не готов к применению");
    }
    const currentProject = await this.projectModel.findOne({ projectId }).lean().exec();
    if (!currentProject) throw new NotFoundException("Исследование не найдено");
    if (
      run.baseProjectUpdatedAt &&
      currentProject.updatedAt.getTime() !== run.baseProjectUpdatedAt.getTime()
    ) {
      throw new ConflictException(
        "Проект изменился после запуска агента. Запусти исследование заново",
      );
    }

    const selectedClaimIds = new Set(input.claimCandidateIds);
    const selectedClaims = run.draft.claims.filter((claim) =>
      selectedClaimIds.has(claim.candidateId)
    );
    if (selectedClaims.length !== selectedClaimIds.size) {
      throw new BadRequestException("Один из выбранных выводов не найден");
    }
    const selectedEvidenceIds = new Set(input.evidenceCandidateIds);
    for (const claim of selectedClaims) {
      for (const link of claim.evidenceLinks) selectedEvidenceIds.add(link.candidateId);
    }
    const selectedEvidence = run.draft.evidence.filter((entry) =>
      selectedEvidenceIds.has(entry.candidateId)
    );
    if (selectedEvidence.length !== selectedEvidenceIds.size) {
      throw new BadRequestException("Один из выбранных источников не найден");
    }
    const selectedActionIds = new Set(input.actionCandidateIds);
    const selectedActions = run.draft.actions.filter((action) =>
      selectedActionIds.has(action.candidateId)
    );
    if (selectedActions.length !== selectedActionIds.size) {
      throw new BadRequestException("Одно из выбранных действий не найдено");
    }

    const evidenceIdByCandidate = new Map(
      selectedEvidence.map((entry) => [
        entry.candidateId,
        `agent:${run.runId}:evidence:${entry.candidateId}`,
      ]),
    );
    if (selectedEvidence.length) {
      await this.evidenceModel.bulkWrite(selectedEvidence.map((entry) => {
        const { candidateId, ...evidence } = entry;
        const evidenceId = evidenceIdByCandidate.get(candidateId)!;
        return {
          updateOne: {
            filter: { evidenceId },
            update: {
              $setOnInsert: {
                ...evidence,
                projectId,
                evidenceId,
                stance: "neutral",
              },
            },
            upsert: true,
          },
        };
      }));
    }
    if (selectedClaims.length) {
      const auditByPair = new Map(run.draft.citationAudits.map((audit) => [
        `${audit.claimCandidateId}:${audit.evidenceCandidateId}`,
        audit,
      ]));
      await this.claimModel.bulkWrite(selectedClaims.map((claim) => ({
        updateOne: {
          filter: { claimId: `agent:${run.runId}:claim:${claim.candidateId}` },
          update: {
            $setOnInsert: {
              projectId,
              claimId: `agent:${run.runId}:claim:${claim.candidateId}`,
              text: claim.text,
              status: "draft",
              confidence: claim.confidence,
              evidenceIds: [],
              evidenceLinks: claim.evidenceLinks.map((link) => {
                const audit = auditByPair.get(
                  `${claim.candidateId}:${link.candidateId}`,
                );
                return {
                  evidenceId: evidenceIdByCandidate.get(link.candidateId)!,
                  stance: link.stance,
                  excerpt: link.excerpt,
                  locator: link.locator,
                  notes: link.notes,
                  verified: audit?.verified,
                  entailmentScore: audit?.entailmentScore,
                  auditNote: audit?.note,
                };
              }),
              alternativeExplanations: claim.alternativeExplanations,
              uncertainty: claim.uncertainty,
            },
          },
          upsert: true,
        },
      })));
    }
    if (selectedActions.length) {
      await this.actionModel.bulkWrite(selectedActions.map((action) => ({
        updateOne: {
          filter: { actionId: `agent:${run.runId}:action:${action.candidateId}` },
          update: {
            $setOnInsert: {
              actionId: `agent:${run.runId}:action:${action.candidateId}`,
              projectId,
              runId: run.runId,
              type: action.type,
              title: action.title,
              reason: action.reason,
              expectedOutcome: action.expectedOutcome,
              priority: action.priority,
              payload: action.payload,
              status: "approved",
            },
          },
          upsert: true,
        },
      })));
    }
    if (input.includeProtocol) {
      await this.projectModel.updateOne(
        { projectId },
        { $set: { protocol: run.draft.protocol } },
      ).exec();
    }
    await this.runModel.updateOne(
      { runId },
      {
        $set: {
          status: "applied",
          phase: "complete",
          progress: 100,
          applyOperationId: input.operationId,
          appliedAt: new Date(),
          leaseUntil: null,
        },
        $unset: { activeProjectId: 1 },
        $push: {
          logs: {
            phase: "complete",
            message: `Применено: ${selectedEvidence.length} источников, ${selectedClaims.length} выводов и ${selectedActions.length} действий`,
            at: new Date().toISOString(),
          },
        },
      },
    ).exec();
    return this.researchService.getWorkspace(projectId);
  }

  private async resumePendingRuns() {
    const recoverable = await this.runModel.find({
      $or: [
        { status: "queued" },
        { status: "running", leaseUntil: null },
        { status: "running", leaseUntil: { $lte: new Date() } },
      ],
    }).select({ runId: 1 }).limit(3).lean().exec();
    for (const run of recoverable) setImmediate(() => void this.executeRun(run.runId));
  }

  private async executeRun(runId: string) {
    const owner = randomUUID();
    const run = await this.runModel.findOneAndUpdate(
      {
        runId,
        $or: [
          { status: "queued" },
          { status: "running", leaseUntil: null },
          { status: "running", leaseUntil: { $lte: new Date() } },
        ],
      },
      {
        $set: {
          status: "running",
          error: null,
          leaseUntil: new Date(Date.now() + LEASE_MS),
          leaseOwner: owner,
        },
        $inc: { leaseEpoch: 1 },
        $push: {
          logs: {
            phase: "planning",
            message: "Агент получил lease и продолжает исследование",
            at: new Date().toISOString(),
          },
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!run) return;
    const lease = { owner, epoch: run.leaseEpoch } satisfies ResearchRunLease;
    const controller = new AbortController();
    this.controllers.set(runId, controller);
    try {
      const project = await this.projectModel.findOne({ projectId: run.projectId }).exec();
      if (!project) throw new Error("Исследование удалено");
      const projectInput = {
        title: project.title,
        decisionStatement: project.decisionStatement,
        primaryQuestion: project.primaryQuestion,
        scope: project.scope,
      };
      const researchModel = run.mode === "quick"
        ? run.reviewModel
        : run.model;
      const hasProtocol = Boolean(run.draft.protocol.subQuestions.trim());
      const plan = hasProtocol
        ? {
            protocol: run.draft.protocol,
            searchQueries: [project.primaryQuestion, ...run.draft.protocol.subQuestions.split("\n")]
              .map((query) => query.trim())
              .filter((query) => query.length >= 3)
              .slice(0, 8),
          }
        : await this.runModelStep(runId, lease, researchModel, () =>
            this.aiAgent.planResearch({
              ...projectInput,
              existingProtocol: project.protocol,
            }, controller.signal, researchModel), controller
          );
      if (!hasProtocol) {
        await this.setPhase(runId, lease, "discovery", 20, "Ищу сильные источники", {
          "draft.protocol": plan.protocol,
        });
      }

      let allEvidence = run.draft.evidence;
      const resumesChallenge = allEvidence.length > 0 && run.phase === "challenge";
      let discoverySummary = run.draft.summary;
      let challengeSummary = "Продолжаю исследование с сохранённого checkpoint.";
      let gaps = [...run.draft.unresolvedGaps];
      if (allEvidence.length === 0) {
        const discovery = await this.runModelStep(runId, lease, researchModel, () =>
          this.aiAgent.discoverResearchEvidence({
            project: projectInput,
            protocol: plan.protocol,
            searchQueries: plan.searchQueries,
            mode: "discovery",
          }, controller.signal, researchModel), controller
        );
        allEvidence = this.mergeEvidence(discovery.evidence, run.budget.maximumSources);
        discoverySummary = discovery.summary;
        gaps = [...discovery.gaps];
        await this.updateSourceUsage(runId, lease, discovery.evidence.length, allEvidence.length);
        await this.setPhase(
          runId,
          lease,
          run.mode === "quick" ? "synthesis" : "challenge",
          run.mode === "quick" ? 45 : 35,
          run.mode === "quick" ? "Формирую выводы" : "Ищу опровержения и пропуски",
          {
            "draft.evidence": allEvidence,
            "draft.summary": discovery.summary,
            "draft.unresolvedGaps": discovery.gaps,
          },
        );
        if (run.mode !== "quick") {
          const challenge = await this.runModelStep(runId, lease, run.reviewModel, () =>
            this.aiAgent.discoverResearchEvidence({
              project: projectInput,
              protocol: plan.protocol,
              searchQueries: plan.searchQueries,
              existingEvidence: allEvidence,
              mode: "challenge",
            }, controller.signal, run.reviewModel), controller
          );
          allEvidence = this.mergeEvidence(
            [...allEvidence, ...challenge.evidence],
            run.budget.maximumSources,
          );
          challengeSummary = challenge.summary;
          gaps = [...new Set([...gaps, ...challenge.gaps])];
          await this.updateSourceUsage(runId, lease, challenge.evidence.length, allEvidence.length);
        }
        if (run.mode === "deep") {
          await this.setPhase(runId, lease, "challenge", 50, "Проверяю критические пробелы повторно", {
            "draft.evidence": allEvidence,
            "draft.unresolvedGaps": gaps,
          });
          const gapSearch = await this.runModelStep(runId, lease, run.reviewModel, () =>
            this.aiAgent.discoverResearchEvidence({
              project: projectInput,
              protocol: plan.protocol,
              searchQueries: [...plan.searchQueries, ...gaps].slice(0, 8),
              existingEvidence: allEvidence,
              mode: "challenge",
            }, controller.signal, run.reviewModel), controller
          );
          allEvidence = this.mergeEvidence(
            [...allEvidence, ...gapSearch.evidence],
            run.budget.maximumSources,
          );
          challengeSummary = `${challengeSummary}\n${gapSearch.summary}`.trim();
          gaps = [...new Set([...gaps, ...gapSearch.gaps])];
          await this.updateSourceUsage(runId, lease, gapSearch.evidence.length, allEvidence.length);
        }
      }
      if (resumesChallenge && run.mode !== "quick") {
        const challenge = await this.runModelStep(runId, lease, run.reviewModel, () =>
          this.aiAgent.discoverResearchEvidence({
            project: projectInput,
            protocol: plan.protocol,
            searchQueries: [...plan.searchQueries, ...gaps].slice(0, 8),
            existingEvidence: allEvidence,
            mode: "challenge",
          }, controller.signal, run.reviewModel), controller
        );
        allEvidence = this.mergeEvidence(
          [...allEvidence, ...challenge.evidence],
          run.budget.maximumSources,
        );
        challengeSummary = challenge.summary;
        gaps = [...new Set([...gaps, ...challenge.gaps])];
        await this.updateSourceUsage(runId, lease, challenge.evidence.length, allEvidence.length);
      }

      if (run.draft.claims.length === 0) {
        await this.setPhase(runId, lease, "synthesis", 68, "Связываю выводы с доказательствами", {
          "draft.evidence": allEvidence,
          "draft.unresolvedGaps": gaps,
        });
      }
      const synthesisModel = run.mode === "deep" ? run.model : run.reviewModel;
      const synthesis = run.draft.claims.length > 0
        ? {
            claims: run.draft.claims,
            summary: run.draft.summary,
            unresolvedGaps: run.draft.unresolvedGaps,
            stopReason: run.draft.stopReason,
          }
        : await this.runModelStep(runId, lease, synthesisModel, () =>
            this.aiAgent.synthesizeResearch({
              project: projectInput,
              protocol: plan.protocol,
              evidence: allEvidence,
              discoverySummary,
              challengeSummary,
              gaps,
            }, controller.signal, synthesisModel), controller
          );
      if (run.draft.claims.length === 0) {
        await this.setPhase(runId, lease, "auditing", 82, "Проверяю каждую связь вывода с источником", {
          "draft.claims": synthesis.claims,
          "draft.summary": synthesis.summary,
          "draft.unresolvedGaps": synthesis.unresolvedGaps,
          "draft.stopReason": synthesis.stopReason,
        });
      }
      const audit = run.draft.citationAudits.length > 0
        ? { audits: run.draft.citationAudits, contradictions: run.draft.contradictions }
        : await this.runModelStep(runId, lease, run.reviewModel, () =>
            this.aiAgent.auditResearchClaims({
              type: run.type,
              mode: run.mode,
              claims: synthesis.claims,
              evidence: allEvidence,
            }, controller.signal, run.reviewModel), controller
          );
      const verifiedClaimIds = new Set(
        audit.audits.filter((entry) => entry.verified).map((entry) => entry.claimCandidateId),
      );
      await this.runModel.updateOne(
        this.leaseFilter(runId, lease),
        { $set: { "usage.validatedClaims": verifiedClaimIds.size } },
      ).exec();
      if (run.draft.actions.length === 0) {
        await this.setPhase(runId, lease, "actions", 92, "Готовлю изменения для учебного плана", {
          "draft.citationAudits": audit.audits,
          "draft.contradictions": audit.contradictions,
        });
      }
      const actions = run.draft.actions.length > 0
        ? run.draft.actions
        : await this.runModelStep(runId, lease, run.reviewModel, () =>
            this.aiAgent.mapResearchActions({
              type: run.type,
              mode: run.mode,
              decisionStatement: project.decisionStatement,
              summary: synthesis.summary,
              claims: synthesis.claims.filter((claim) => verifiedClaimIds.has(claim.candidateId)),
              contradictions: audit.contradictions,
              unresolvedGaps: synthesis.unresolvedGaps,
            }, controller.signal, run.reviewModel), controller
          );
      await this.runModel.updateOne(
        this.leaseFilter(runId, lease),
        {
          $set: {
            status: "review_ready",
            phase: "review",
            progress: 100,
            leaseUntil: null,
            leaseOwner: null,
            draft: {
              protocol: plan.protocol,
              evidence: allEvidence,
              claims: synthesis.claims,
              citationAudits: audit.audits,
              contradictions: audit.contradictions,
              actions,
              summary: synthesis.summary,
              unresolvedGaps: synthesis.unresolvedGaps,
              stopReason: synthesis.stopReason,
            },
          },
          $unset: { activeProjectId: 1 },
          $push: {
            logs: {
              phase: "review",
              message: "Черновик готов и ждёт подтверждения",
              at: new Date().toISOString(),
            },
          },
        },
      ).exec();
    } catch (error) {
      const current = await this.runModel.findOne({ runId })
        .select({ status: 1 })
        .lean()
        .exec();
      if (current?.status !== "cancelled" && !(error instanceof ResearchLeaseLostError)) {
        const budgetExceeded = error instanceof ResearchBudgetExceededError;
        await this.runModel.updateOne(
          this.leaseFilter(runId, lease),
          {
            $set: {
              status: budgetExceeded ? "partially_completed" : "failed",
              phase: budgetExceeded ? "review" : "complete",
              leaseUntil: null,
              leaseOwner: null,
              error: error instanceof Error ? error.message : "Неизвестная ошибка агента",
            },
            $unset: { activeProjectId: 1 },
            $push: {
              logs: {
                phase: "complete",
                message: budgetExceeded
                  ? "Исследование остановлено по бюджету; доступен частичный результат"
                  : "Исследование завершилось с ошибкой",
                at: new Date().toISOString(),
              },
            },
          },
        ).exec();
      }
    } finally {
      if (this.controllers.get(runId) === controller) {
        this.controllers.delete(runId);
      }
    }
  }

  private async runModelStep<T>(
    runId: string,
    lease: ResearchRunLease,
    model: string,
    operation: () => Promise<T>,
    controller: AbortController,
  ) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const run = await this.runModel.findOne(this.leaseFilter(runId, lease)).lean().exec();
      if (!run || run.status !== "running") throw new ResearchLeaseLostError();
      const startedAt = run.startedAt?.getTime() ?? Date.now();
      const deadlineAt = startedAt + run.budget.maximumDurationMinutes * 60_000;
      if (Date.now() >= deadlineAt) {
        throw new ResearchBudgetExceededError("Истекло максимальное время исследования");
      }
      const usesSol = model.toLowerCase().includes("sol");
      if (run.usage.modelCalls >= run.budget.maximumModelCalls) {
        throw new ResearchBudgetExceededError("Исчерпан лимит AI-вызовов");
      }
      if (usesSol && run.usage.solCalls >= run.budget.maximumSolCalls) {
        throw new ResearchBudgetExceededError("Исчерпан лимит вызовов Sol");
      }
      const reserved = await this.runModel.updateOne(
        this.leaseFilter(runId, lease),
        {
          $inc: {
            "usage.modelCalls": 1,
            ...(usesSol ? { "usage.solCalls": 1 } : {}),
          },
          $set: { leaseUntil: new Date(Date.now() + LEASE_MS) },
        },
      ).exec();
      if (reserved.modifiedCount === 0) throw new ResearchLeaseLostError();
      let leaseLost = false;
      const heartbeat = setInterval(() => {
        void this.runModel.updateOne(
          this.leaseFilter(runId, lease),
          { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } },
        ).exec().then((result) => {
          if (result.matchedCount === 0) {
            leaseLost = true;
            controller.abort();
          }
        });
      }, HEARTBEAT_MS);
      heartbeat.unref?.();
      try {
        const result = await operation();
        if (leaseLost) throw new ResearchLeaseLostError();
        return result;
      } catch (error) {
        lastError = error;
        if (leaseLost || error instanceof ResearchLeaseLostError) {
          throw new ResearchLeaseLostError();
        }
        if (attempt === 1) throw error;
        await this.runModel.updateOne(
          this.leaseFilter(runId, lease),
          {
            $push: {
              logs: {
                phase: run.phase,
                message: "Временная ошибка AI; повторяю текущий шаг один раз",
                at: new Date().toISOString(),
              },
            },
          },
        ).exec();
      } finally {
        clearInterval(heartbeat);
      }
    }
    throw lastError;
  }

  private async updateSourceUsage(
    runId: string,
    lease: ResearchRunLease,
    discovered: number,
    accepted: number,
  ) {
    await this.runModel.updateOne(
      this.leaseFilter(runId, lease),
      {
        $inc: { "usage.sourcesDiscovered": discovered },
        $set: { "usage.sourcesAccepted": accepted },
      },
    ).exec();
  }

  private mergeEvidence(entries: ResearchAgentEvidenceDraft[], maximumSources: number) {
    const unique = new Map<string, ResearchAgentEvidenceDraft>();
    for (const entry of entries) {
      if (!unique.has(entry.url)) unique.set(entry.url, entry);
    }
    return [...unique.values()].slice(0, maximumSources).map((entry, index) => ({
      ...entry,
      candidateId: `source-${index + 1}`,
    }));
  }

  private async setPhase(
    runId: string,
    lease: ResearchRunLease,
    phase: ResearchAgentPhase,
    progress: number,
    message: string,
    fields: Record<string, unknown>,
  ) {
    const result = await this.runModel.updateOne(
      this.leaseFilter(runId, lease),
      {
        $set: {
          phase,
          progress,
          leaseUntil: new Date(Date.now() + LEASE_MS),
          ...fields,
        },
        $push: { logs: { phase, message, at: new Date().toISOString() } },
      },
    ).exec();
    if (result.modifiedCount === 0) throw new ResearchLeaseLostError();
  }

  private leaseFilter(runId: string, lease: ResearchRunLease) {
    return {
      runId,
      status: "running" as const,
      leaseOwner: lease.owner,
      leaseEpoch: lease.epoch,
    };
  }

  private async requireRun(projectId: string, runId: string) {
    const run = await this.runModel.findOne({ projectId, runId }).exec();
    if (!run) throw new NotFoundException("Запуск исследовательского агента не найден");
    return run;
  }

  private parseStart(value: unknown): StartResearchAgentRun {
    const parsed = startResearchAgentRunSchema.safeParse(value);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message);
    return parsed.data;
  }

  private parseApply(value: unknown): ApplyResearchAgentRun {
    const parsed = applyResearchAgentRunSchema.safeParse(value);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message);
    return parsed.data;
  }
}
