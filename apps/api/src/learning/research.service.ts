import { randomUUID } from "node:crypto";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  EMPTY_RESEARCH_PROTOCOL,
  RESEARCH_QUALITY_GATE_KEYS,
  RESEARCH_STAGE_KEYS,
  createResearchClaimSchema,
  createResearchEvidenceSchema,
  createResearchProjectSchema,
  updateResearchActionSchema,
  updateResearchClaimSchema,
  updateResearchEvidenceSchema,
  updateResearchProjectSchema,
  type CreateResearchClaim,
  type CreateResearchEvidence,
  type CreateResearchProject,
  type ResearchClaim,
  type ResearchAction,
  type ResearchEvidence,
  type ResearchProject,
  type UpdateResearchClaim,
  type UpdateResearchEvidence,
  type UpdateResearchProject,
} from "@prep/contracts";
import type { Model } from "mongoose";
import type { ZodType } from "zod";

import { ResearchClaimEntry } from "./schemas/research-claim.schema";
import { ResearchEvidenceEntry } from "./schemas/research-evidence.schema";
import { ResearchProject as ResearchProjectEntry } from "./schemas/research-project.schema";
import { calculateResearchMetrics } from "./research-quality";
import { ResearchActionEntry } from "../research/schemas/research-action.schema";
import { ResearchAgentRunEntry } from "../research/schemas/research-agent-run.schema";

const parsePayload = <T>(schema: ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException(result.error.issues.map((issue) => issue.message).join(", "));
  }
  return result.data;
};

const serializeProject = (project: ResearchProjectEntry): ResearchProject => ({
  projectId: project.projectId,
  title: project.title,
  decisionStatement: project.decisionStatement,
  primaryQuestion: project.primaryQuestion,
  scope: project.scope,
  design: project.design,
  status: project.status,
  startDate: project.startDate,
  targetDate: project.targetDate,
  nextAction: project.nextAction,
  protocol: { ...EMPTY_RESEARCH_PROTOCOL, ...project.protocol },
  stages: project.stages,
  qualityGates: project.qualityGates,
  risks: project.risks,
  milestones: project.milestones,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

const serializeEvidence = (entry: ResearchEvidenceEntry): ResearchEvidence => ({
  evidenceId: entry.evidenceId,
  projectId: entry.projectId,
  title: entry.title,
  url: entry.url,
  sourceType: entry.sourceType,
  stance: entry.stance,
  quality: entry.quality,
  notes: entry.notes,
  sourceKind: entry.sourceKind ?? "unassessed",
  author: entry.author ?? "",
  publishedAt: entry.publishedAt ?? null,
  accessedAt: entry.accessedAt ?? null,
  originId: entry.originId ?? "",
  independence: entry.independence ?? "unknown",
  freshness: entry.freshness ?? "unassessed",
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
});

const serializeClaim = (entry: ResearchClaimEntry): ResearchClaim => ({
  claimId: entry.claimId,
  projectId: entry.projectId,
  text: entry.text,
  status: entry.status,
  confidence: entry.confidence,
  evidenceIds: entry.evidenceIds ?? [],
  evidenceLinks: entry.evidenceLinks ?? [],
  alternativeExplanations: entry.alternativeExplanations,
  uncertainty: entry.uncertainty,
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
});

const serializeAction = (entry: ResearchActionEntry): ResearchAction => ({
  actionId: entry.actionId,
  projectId: entry.projectId,
  runId: entry.runId,
  type: entry.type,
  title: entry.title,
  reason: entry.reason,
  expectedOutcome: entry.expectedOutcome,
  priority: entry.priority,
  payload: entry.payload ?? {},
  status: entry.status,
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
});

@Injectable()
export class ResearchService {
  constructor(
    @InjectModel(ResearchProjectEntry.name)
    private readonly projectModel: Model<ResearchProjectEntry>,
    @InjectModel(ResearchEvidenceEntry.name)
    private readonly evidenceModel: Model<ResearchEvidenceEntry>,
    @InjectModel(ResearchClaimEntry.name)
    private readonly claimModel: Model<ResearchClaimEntry>,
    @InjectModel(ResearchActionEntry.name)
    private readonly actionModel: Model<ResearchActionEntry>,
    @InjectModel(ResearchAgentRunEntry.name)
    private readonly agentRunModel: Model<ResearchAgentRunEntry>,
  ) {}

  async listProjects() {
    const projects = await this.projectModel.find().sort({ updatedAt: -1 }).exec();
    return projects.map(serializeProject);
  }

  async getWorkspace(projectId: string) {
    const [project, evidence, claims, actions] = await Promise.all([
      this.requireProject(projectId),
      this.evidenceModel.find({ projectId }).sort({ updatedAt: -1 }).exec(),
      this.claimModel.find({ projectId }).sort({ updatedAt: -1 }).exec(),
      this.actionModel.find({ projectId }).sort({ priority: -1, updatedAt: -1 }).exec(),
    ]);
    const serializedProject = serializeProject(project);
    const serializedEvidence = evidence.map(serializeEvidence);
    const serializedClaims = claims.map(serializeClaim);
    return {
      project: serializedProject,
      evidence: serializedEvidence,
      claims: serializedClaims,
      actions: actions.map(serializeAction),
      metrics: calculateResearchMetrics(
        serializedProject,
        serializedEvidence,
        serializedClaims,
      ),
    };
  }

  async createProject(value: unknown) {
    const input = parsePayload<CreateResearchProject>(createResearchProjectSchema, value);
    const project = await this.projectModel.create({
      ...input,
      projectId: randomUUID(),
      stages: RESEARCH_STAGE_KEYS.map((key) => ({ key, status: "pending", note: "" })),
      qualityGates: RESEARCH_QUALITY_GATE_KEYS.map((key) => ({
        key,
        status: "pending",
        note: "",
      })),
      risks: [],
      milestones: [],
    });
    return serializeProject(project);
  }

  async updateProject(projectId: string, value: unknown) {
    const patch = parsePayload<UpdateResearchProject>(updateResearchProjectSchema, value);
    const project = await this.projectModel.findOneAndUpdate(
      { projectId },
      { $set: patch },
      { new: true, runValidators: true },
    ).exec();
    if (!project) throw new NotFoundException("Исследование не найдено");
    return serializeProject(project);
  }

  async deleteProject(projectId: string) {
    const project = await this.projectModel.findOneAndDelete({ projectId }).exec();
    if (!project) throw new NotFoundException("Исследование не найдено");
    await Promise.all([
      this.evidenceModel.deleteMany({ projectId }).exec(),
      this.claimModel.deleteMany({ projectId }).exec(),
      this.actionModel.deleteMany({ projectId }).exec(),
      this.agentRunModel.deleteMany({ projectId }).exec(),
    ]);
    return { deleted: true };
  }

  async createEvidence(projectId: string, value: unknown) {
    await this.requireProject(projectId);
    const input = parsePayload<CreateResearchEvidence>(createResearchEvidenceSchema, value);
    const entry = await this.evidenceModel.create({
      ...input,
      projectId,
      evidenceId: randomUUID(),
    });
    return serializeEvidence(entry);
  }

  async updateEvidence(projectId: string, evidenceId: string, value: unknown) {
    const patch = parsePayload<UpdateResearchEvidence>(updateResearchEvidenceSchema, value);
    const entry = await this.evidenceModel.findOneAndUpdate(
      { projectId, evidenceId },
      { $set: patch },
      { new: true, runValidators: true },
    ).exec();
    if (!entry) throw new NotFoundException("Источник не найден");
    return serializeEvidence(entry);
  }

  async deleteEvidence(projectId: string, evidenceId: string) {
    const entry = await this.evidenceModel.findOneAndDelete({ projectId, evidenceId }).exec();
    if (!entry) throw new NotFoundException("Источник не найден");
    await this.claimModel.updateMany(
      { projectId, evidenceIds: evidenceId },
      { $pull: { evidenceIds: evidenceId } },
    ).exec();
    await this.claimModel.updateMany(
      { projectId, "evidenceLinks.evidenceId": evidenceId },
      { $pull: { evidenceLinks: { evidenceId } } },
    ).exec();
    return { deleted: true };
  }

  async createClaim(projectId: string, value: unknown) {
    await this.requireProject(projectId);
    const input = parsePayload<CreateResearchClaim>(createResearchClaimSchema, value);
    await this.validateClaimEvidence(projectId, input.evidenceIds, input.evidenceLinks);
    const entry = await this.claimModel.create({
      ...input,
      projectId,
      claimId: randomUUID(),
    });
    return serializeClaim(entry);
  }

  async updateClaim(projectId: string, claimId: string, value: unknown) {
    const patch = parsePayload<UpdateResearchClaim>(updateResearchClaimSchema, value);
    await this.validateClaimEvidence(
      projectId,
      patch.evidenceIds ?? [],
      patch.evidenceLinks ?? [],
    );
    const entry = await this.claimModel.findOneAndUpdate(
      { projectId, claimId },
      { $set: patch },
      { new: true, runValidators: true },
    ).exec();
    if (!entry) throw new NotFoundException("Вывод не найден");
    return serializeClaim(entry);
  }

  async deleteClaim(projectId: string, claimId: string) {
    const entry = await this.claimModel.findOneAndDelete({ projectId, claimId }).exec();
    if (!entry) throw new NotFoundException("Вывод не найден");
    return { deleted: true };
  }

  async updateActionStatus(projectId: string, actionId: string, value: unknown) {
    const { status } = parsePayload(updateResearchActionSchema, value);
    const action = await this.actionModel.findOneAndUpdate(
      { projectId, actionId },
      { $set: { status } },
      { returnDocument: "after", runValidators: true },
    ).exec();
    if (!action) throw new NotFoundException("Действие исследования не найдено");
    return serializeAction(action);
  }

  private async requireProject(projectId: string) {
    const project = await this.projectModel.findOne({ projectId }).exec();
    if (!project) throw new NotFoundException("Исследование не найдено");
    return project;
  }

  private async validateEvidenceIds(projectId: string, evidenceIds: string[]) {
    if (evidenceIds.length === 0) return;
    const count = await this.evidenceModel.countDocuments({
      projectId,
      evidenceId: { $in: [...new Set(evidenceIds)] },
    }).exec();
    if (count !== new Set(evidenceIds).size) {
      throw new BadRequestException("Один из выбранных источников не найден");
    }
  }

  private async validateClaimEvidence(
    projectId: string,
    evidenceIds: string[],
    evidenceLinks: Array<{ evidenceId: string }>,
  ) {
    const linkedIds = evidenceLinks.map((link) => link.evidenceId);
    if (new Set(linkedIds).size !== linkedIds.length) {
      throw new BadRequestException("Один источник нельзя связать с выводом дважды");
    }
    await this.validateEvidenceIds(projectId, [...evidenceIds, ...linkedIds]);
  }
}
