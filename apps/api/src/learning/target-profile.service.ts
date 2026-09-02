import { createHash, randomUUID } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { targetProfileV2Schema, type SkillCapabilityV3, type TargetProfileV2 } from "@prep/contracts";
import type { Model } from "mongoose";

import { TargetProfileV2Entry } from "./schemas/target-profile-v2.schema";

type RequirementSeed = { skillId: string; capabilities: SkillCapabilityV3[]; importance: number; required: boolean };

const DEFAULT_REQUIREMENTS: Record<string, RequirementSeed[]> = {
  general: [
    { skillId: "javascript", capabilities: ["explain", "apply", "debug", "code", "resilience"], importance: 1.3, required: true },
    { skillId: "async", capabilities: ["explain", "apply", "debug", "resilience"], importance: 1.2, required: true },
    { skillId: "react", capabilities: ["explain", "apply", "debug", "code", "design"], importance: 1.3, required: true },
    { skillId: "typescript", capabilities: ["explain", "apply", "code"], importance: 0.9, required: true },
    { skillId: "browser", capabilities: ["explain", "apply", "debug"], importance: 0.9, required: true },
    { skillId: "testing", capabilities: ["explain", "apply", "design"], importance: 0.8, required: false },
    { skillId: "architecture", capabilities: ["explain", "design", "defend", "transfer"], importance: 0.9, required: false },
  ],
  yandex: [
    { skillId: "javascript", capabilities: ["explain", "apply", "debug", "code", "resilience"], importance: 1.5, required: true },
    { skillId: "async", capabilities: ["explain", "apply", "debug", "resilience"], importance: 1.4, required: true },
    { skillId: "algorithms", capabilities: ["apply", "code", "transfer"], importance: 1.4, required: true },
    { skillId: "browser", capabilities: ["explain", "apply", "debug"], importance: 1, required: true },
    { skillId: "react", capabilities: ["explain", "apply", "debug"], importance: 0.9, required: false },
  ],
  ozon: [
    { skillId: "javascript", capabilities: ["explain", "apply", "debug", "code"], importance: 1.3, required: true },
    { skillId: "react", capabilities: ["explain", "apply", "debug", "code", "design"], importance: 1.4, required: true },
    { skillId: "typescript", capabilities: ["explain", "apply", "code"], importance: 1.1, required: true },
    { skillId: "architecture", capabilities: ["design", "defend", "transfer"], importance: 1, required: true },
    { skillId: "testing", capabilities: ["apply", "debug", "design"], importance: 0.9, required: false },
  ],
};

const keywordProfiles: Array<{ pattern: RegExp; seed: RequirementSeed }> = [
  { pattern: /react|jsx|hook/i, seed: { skillId: "react", capabilities: ["apply", "debug", "code", "design"], importance: 1.4, required: true } },
  { pattern: /typescript|типизац/i, seed: { skillId: "typescript", capabilities: ["explain", "apply", "code"], importance: 1.1, required: true } },
  { pattern: /websocket|real.?time|socket/i, seed: { skillId: "async.realtime", capabilities: ["apply", "debug", "design", "resilience"], importance: 1.3, required: true } },
  { pattern: /тест|vitest|jest|playwright/i, seed: { skillId: "testing", capabilities: ["apply", "debug", "design"], importance: 1, required: true } },
  { pattern: /архитект|system design|solid/i, seed: { skillId: "architecture", capabilities: ["design", "defend", "transfer"], importance: 1.1, required: true } },
  { pattern: /алгоритм|структур.*данн/i, seed: { skillId: "algorithms", capabilities: ["apply", "code", "transfer"], importance: 1.1, required: true } },
];

export const requirementsFromVacancy = (text: string) => {
  const selected = keywordProfiles
    .filter((profile) => profile.pattern.test(text))
    .map((profile) => profile.seed);
  return selected.length ? selected : DEFAULT_REQUIREMENTS.general!;
};

@Injectable()
export class TargetProfileService {
  constructor(
    @InjectModel(TargetProfileV2Entry.name)
    private readonly targetModel: Model<TargetProfileV2Entry>,
  ) {}

  async get(targetId = "general"): Promise<TargetProfileV2> {
    const stored = await this.targetModel.findOne({ targetId }).lean().exec();
    if (stored) return this.serialize(stored);
    const seed = DEFAULT_REQUIREMENTS[targetId];
    if (!seed) throw new NotFoundException("Профиль подготовки не найден");
    return this.defaultProfile(targetId, seed);
  }

  async list() {
    const custom = await this.targetModel.find().sort({ updatedAt: -1 }).lean().exec();
    const customIds = new Set(custom.map((item) => item.targetId));
    return [
      ...Object.entries(DEFAULT_REQUIREMENTS)
        .filter(([targetId]) => !customIds.has(targetId))
        .map(([targetId, seed]) => this.defaultProfile(targetId, seed)),
      ...custom.map((item) => this.serialize(item)),
    ];
  }

  async createFromVacancy(input: {
    vacancyText: string;
    company?: string | null;
    role?: string | null;
    seniority?: string | null;
    interviewAt?: string | null;
  }) {
    const text = input.vacancyText.trim();
    const requirements = requirementsFromVacancy(text);
    const vacancyHash = createHash("sha256").update(text).digest("hex");
    const existing = await this.targetModel.findOne({ vacancyHash }).lean().exec();
    if (existing) return this.serialize(existing);
    const targetId = `vacancy-${randomUUID()}`;
    const created = await this.targetModel.create({
      targetId,
      label: [input.company, input.role].filter(Boolean).join(" · ") || "Целевая вакансия",
      company: input.company ?? null,
      role: input.role ?? null,
      seniority: input.seniority ?? null,
      interviewAt: input.interviewAt ? new Date(input.interviewAt) : null,
      vacancyHash,
      requirements: requirements.map((item) => ({ ...item, source: "vacancy_keyword_mapper-v1" })),
      version: "2",
    });
    return this.serialize(created);
  }

  private defaultProfile(targetId: string, seed: RequirementSeed[]): TargetProfileV2 {
    const now = new Date(0).toISOString();
    return targetProfileV2Schema.parse({
      targetId,
      label: targetId === "yandex" ? "Яндекс Frontend" : targetId === "ozon" ? "Ozon Frontend" : "Frontend Middle+/Senior",
      company: targetId === "general" ? null : targetId,
      role: "Frontend Developer",
      seniority: null,
      interviewAt: null,
      vacancyHash: null,
      requirements: seed.map((item) => ({ ...item, source: "builtin-target-v2" })),
      version: "2",
      createdAt: now,
      updatedAt: now,
    });
  }

  private serialize(value: TargetProfileV2Entry & { createdAt: Date; updatedAt: Date }): TargetProfileV2 {
    return targetProfileV2Schema.parse({
      targetId: value.targetId,
      label: value.label,
      company: value.company ?? null,
      role: value.role ?? null,
      seniority: value.seniority ?? null,
      interviewAt: value.interviewAt?.toISOString() ?? null,
      vacancyHash: value.vacancyHash ?? null,
      requirements: value.requirements,
      version: "2",
      createdAt: value.createdAt.toISOString(),
      updatedAt: value.updatedAt.toISOString(),
    });
  }
}
