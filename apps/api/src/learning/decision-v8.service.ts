import { createHash } from "node:crypto";

import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decisionPlanV8Schema, type NextBestActionV8 } from "@prep/contracts";

import { MasteryV3Service } from "./mastery/mastery-v3.service";

@Injectable()
export class DecisionV8Service {
  constructor(
    private readonly config: ConfigService,
    private readonly mastery: MasteryV3Service,
  ) {}

  async getPlan(targetId = "general", availableMinutes = 90) {
    if (this.config.get<string>("PLANNER_V8_ENABLED") === "false") {
      throw new ServiceUnavailableException("Decision Loop v8 временно отключён");
    }
    const overview = await this.mastery.getOverview(targetId);
    const daysUntilInterview = overview.target.interviewAt
      ? Math.ceil((new Date(overview.target.interviewAt).getTime() - Date.now()) / 86_400_000)
      : null;
    const requirementMap = new Map(overview.target.requirements.flatMap((requirement) =>
      requirement.capabilities.map((capability) => [
        `${requirement.skillId}:${capability}`,
        requirement,
      ] as const)));
    const candidates = overview.skills.flatMap((skill) => skill.capabilities.flatMap((capability) => {
      const requirement = requirementMap.get(`${skill.skillId}:${capability.capability}`);
      if (!requirement) return [];
      const kind = capability.evidenceCount === 0
        ? "diagnostic" as const
        : capability.independentFormCount < 2
          ? "parallel_retest" as const
          : capability.independentContextCount < 2
            ? "transfer" as const
            : "intervention" as const;
      const urgency = daysUntilInterview !== null && daysUntilInterview <= 7 && requirement.required
        ? 1.25
        : 1;
      const risk = Math.round((100 - capability.lower) * requirement.importance * urgency);
      const minutes = kind === "diagnostic" ? 15 : kind === "transfer" ? 25 : 20;
      return [{ skill, capability, requirement, kind, risk, minutes }];
    })).sort((left, right) => right.risk - left.risk);
    const actions: NextBestActionV8[] = [];
    let remaining = Math.max(15, availableMinutes);
    if (daysUntilInterview !== null && daysUntilInterview <= 3 && remaining >= 45) {
      actions.push(this.stressExamAction(targetId, overview.target.interviewAt, 45));
      remaining -= 45;
    }
    for (const candidate of candidates) {
      if (actions.length >= 3 || candidate.minutes > remaining) continue;
      const seed = `${targetId}:${candidate.skill.skillId}:${candidate.capability.capability}:${candidate.kind}`;
      actions.push({
        actionId: createHash("sha256").update(seed).digest("hex").slice(0, 24),
        targetId,
        skillId: candidate.skill.skillId,
        capability: candidate.capability.capability,
        kind: candidate.kind,
        title: `${candidate.skill.label}: ${candidate.capability.capability}`,
        reason: candidate.capability.evidenceCount === 0
          ? "Нет независимого доказательства — сначала нужна диагностика."
          : `Нижняя граница ${Math.round(candidate.capability.lower)}%, риск остаётся высоким.`,
        estimatedMinutes: candidate.minutes,
        expectedRiskReduction: Math.min(100, candidate.risk),
        dueAt: overview.target.interviewAt,
      });
      remaining -= candidate.minutes;
    }
    if (
      !actions.some((action) => action.kind === "stress_exam") &&
      (overview.readiness.decision === "ready" || (daysUntilInterview !== null && daysUntilInterview <= 7)) &&
      remaining >= 35 &&
      actions.length < 3
    ) {
      actions.push(this.stressExamAction(targetId, overview.target.interviewAt, Math.min(remaining, 60)));
    }
    return decisionPlanV8Schema.parse({
      targetId,
      generatedAt: new Date().toISOString(),
      availableMinutes,
      readinessDecision: overview.readiness.decision,
      actions,
    });
  }

  private stressExamAction(targetId: string, dueAt: string | null, minutes: number): NextBestActionV8 {
    return {
      actionId: createHash("sha256").update(`${targetId}:stress-exam`).digest("hex").slice(0, 24),
      targetId,
      skillId: "interview",
      capability: "resilience",
      kind: "stress_exam",
      title: "Контрольный экзамен без подсказок",
      reason: "Дедлайн близко или базовые навыки готовы — проверим устойчивость в полном сценарии.",
      estimatedMinutes: minutes,
      expectedRiskReduction: 15,
      dueAt,
    };
  }
}
