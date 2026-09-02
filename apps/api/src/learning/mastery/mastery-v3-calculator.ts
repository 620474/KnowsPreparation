import type {
  AssessmentEventV3,
  CapabilityMasteryV3,
  SkillCapabilityV3,
  SkillDefinition,
  SkillMasteryV3,
} from "@prep/contracts";

const DAY_MS = 86_400_000;
const HALF_LIFE_DAYS = 45;
const CAPABILITIES: SkillCapabilityV3[] = [
  "recall", "explain", "apply", "debug", "code", "design", "defend", "transfer", "resilience",
];

const REQUIRED_BY_ROOT: Record<string, SkillCapabilityV3[]> = {
  javascript: ["recall", "explain", "apply", "debug", "code", "resilience"],
  typescript: ["recall", "explain", "apply", "debug", "code"],
  async: ["recall", "explain", "apply", "debug", "code", "resilience"],
  react: ["recall", "explain", "apply", "debug", "code", "design"],
  browser: ["recall", "explain", "apply", "debug"],
  algorithms: ["explain", "apply", "code", "transfer"],
  testing: ["recall", "explain", "apply", "debug", "code", "design"],
  architecture: ["recall", "explain", "apply", "design", "defend", "transfer"],
  "css-a11y": ["recall", "explain", "apply", "code"],
  ai: ["recall", "explain", "apply", "defend"],
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const round = (value: number) => Math.round(value * 10) / 10;

export const requiredCapabilitiesForSkillV3 = (definition: SkillDefinition) =>
  REQUIRED_BY_ROOT[definition.legacySkillKey] ?? ["recall", "explain", "apply"];

function aggregateCapability(
  skillId: string,
  capability: SkillCapabilityV3,
  required: boolean,
  events: AssessmentEventV3[],
  now: Date,
): CapabilityMasteryV3 {
  const latestByForm = new Map<string, { event: AssessmentEventV3; score: number; reliability: number; difficulty: number }>();
  for (const event of events) {
    const observations = event.observations.filter(
      (observation) => observation.skillId === skillId && observation.capability === capability,
    );
    if (!observations.length) continue;
    const formKey = `${event.source.conceptFamilyId}:${event.source.contextFamilyId}:${event.source.formId}`;
    const current = latestByForm.get(formKey);
    if (current && current.event.occurredAt >= event.occurredAt) continue;
    const count = observations.length;
    latestByForm.set(formKey, {
      event,
      score: observations.reduce((sum, item) => sum + item.score, 0) / count,
      reliability: observations.reduce((sum, item) => sum + item.reliability, 0) / count,
      difficulty: observations.reduce((sum, item) => sum + item.difficulty, 0) / count,
    });
  }
  const independent = [...latestByForm.values()];
  let alpha = 1;
  let beta = 1;
  for (const item of independent) {
    const ageDays = Math.max(0, now.getTime() - new Date(item.event.occurredAt).getTime()) / DAY_MS;
    const freshness = 0.5 ** (ageDays / HALF_LIFE_DAYS);
    const assistance = item.event.conditions.aiMode === "assisted" ? 0.55 : 1;
    const difficulty = 0.7 + item.difficulty * 0.12;
    const weight = item.reliability * freshness * assistance * difficulty;
    alpha += weight * item.score / 100;
    beta += weight * (1 - item.score / 100);
  }
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const margin = 1.96 * Math.sqrt(variance);
  const contextCount = new Set(independent.map((item) => item.event.source.contextFamilyId)).size;
  const noAiCount = independent.filter((item) => item.event.conditions.aiMode === "none").length;
  const confidence = independent.length >= 6 && contextCount >= 2 && noAiCount >= 3
    ? "high" as const
    : independent.length >= 3 && noAiCount >= 1
      ? "medium" as const
      : "low" as const;
  return {
    capability,
    required,
    posteriorMean: round(clamp(mean * 100)),
    lower: round(clamp((mean - margin) * 100)),
    upper: round(clamp((mean + margin) * 100)),
    alpha: round(alpha),
    beta: round(beta),
    evidenceCount: independent.length,
    independentFormCount: independent.length,
    independentContextCount: contextCount,
    noAiEvidenceCount: noAiCount,
    latestEvidenceAt: independent.reduce<string | null>(
      (latest, item) => !latest || item.event.occurredAt > latest ? item.event.occurredAt : latest,
      null,
    ),
    confidence,
  };
}

export function replaySkillMasteryV3(
  definition: SkillDefinition,
  events: AssessmentEventV3[],
  now = new Date(),
): SkillMasteryV3 {
  const requiredCapabilities = requiredCapabilitiesForSkillV3(definition);
  const capabilities = CAPABILITIES.map((capability) => aggregateCapability(
    definition.skillId,
    capability,
    requiredCapabilities.includes(capability),
    events,
    now,
  ));
  const required = capabilities.filter((item) => item.required);
  const observed = required.filter((item) => item.evidenceCount > 0);
  const values = required.map((item) => item.posteriorMean);
  const lowers = required.map((item) => item.evidenceCount > 0 ? item.lower : 0);
  const uppers = required.map((item) => item.evidenceCount > 0 ? item.upper : 100);
  const average = (items: number[]) => items.reduce((sum, item) => sum + item, 0) / items.length;
  return {
    skillId: definition.skillId,
    label: definition.label,
    category: definition.category,
    posteriorMean: round(average(values)),
    lower: round(average(lowers)),
    upper: round(average(uppers)),
    coverage: Math.round(observed.length / required.length * 100),
    requiredCapabilities,
    unknownCapabilities: required.filter((item) => item.evidenceCount === 0).map((item) => item.capability),
    capabilities,
  };
}
