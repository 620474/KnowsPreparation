import {
  type CapabilityMastery,
  type EvidenceEvent,
  type SkillCapability,
  type SkillDefinition,
  type SkillMastery,
} from "@prep/contracts";

export const MASTERY_MODEL_VERSION = "evidence-decay-v1";
const DAY_MS = 86_400_000;
const HALF_LIFE_DAYS = 45;
const CAPABILITIES: SkillCapability[] = ["recall", "explain", "apply", "debug", "code", "defend"];

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const aggregateCapability = (
  skillId: string,
  capability: SkillCapability,
  evidence: EvidenceEvent[],
  now: Date,
): CapabilityMastery => {
  const matching = evidence.flatMap((event) =>
    event.observations
      .filter((observation) => observation.skillId === skillId && observation.capability === capability)
      .map((observation) => ({ event, observation })),
  );
  const latestByFamily = new Map<string, (typeof matching)[number]>();
  for (const item of matching) {
    const current = latestByFamily.get(item.event.source.itemFamilyId);
    if (!current || item.event.occurredAt > current.event.occurredAt) {
      latestByFamily.set(item.event.source.itemFamilyId, item);
    }
  }
  const independent = [...latestByFamily.values()];
  if (!independent.length) {
    return {
      capability,
      estimate: null,
      lower: null,
      upper: null,
      evidenceCount: 0,
      independentFamilyCount: 0,
      transferEvidenceCount: 0,
      noAiEvidenceCount: 0,
      latestEvidenceAt: null,
      confidence: "low",
    };
  }

  let weightedScore = 0;
  let totalWeight = 0;
  for (const { event, observation } of independent) {
    const ageDays = Math.max(0, now.getTime() - new Date(event.occurredAt).getTime()) / DAY_MS;
    const freshness = 0.5 ** (ageDays / HALF_LIFE_DAYS);
    const assistanceWeight = event.assistance.mode === "ai_assisted" ? 0.7 : 1;
    const weight = observation.reliability * freshness * assistanceWeight;
    weightedScore += observation.score * weight;
    totalWeight += weight;
  }
  const rawEstimate = totalWeight ? weightedScore / totalWeight : 0;
  const transferEvidenceCount = independent.filter(
    ({ event }) => event.transferLevel !== "familiar",
  ).length;
  const noAiEvidenceCount = independent.filter(
    ({ event }) => event.assistance.mode === "no_ai",
  ).length;
  let estimate = rawEstimate;
  if (independent.length < 3) estimate = Math.min(estimate, 69);
  if (["apply", "debug", "code", "defend"].includes(capability) && transferEvidenceCount === 0) {
    estimate = Math.min(estimate, 79);
  }
  const uncertainty = Math.max(6, Math.min(28, 28 / Math.sqrt(Math.max(1, totalWeight))));
  const latestEvidenceAt = independent.reduce(
    (latest, { event }) => event.occurredAt > latest ? event.occurredAt : latest,
    independent[0]!.event.occurredAt,
  );
  const confidence = independent.length >= 6 && totalWeight >= 4.5 && transferEvidenceCount > 0
    ? "high"
    : independent.length >= 3 && totalWeight >= 2
      ? "medium"
      : "low";
  return {
    capability,
    estimate: clamp(estimate),
    lower: clamp(estimate - uncertainty),
    upper: clamp(estimate + uncertainty),
    evidenceCount: matching.length,
    independentFamilyCount: independent.length,
    transferEvidenceCount,
    noAiEvidenceCount,
    latestEvidenceAt,
    confidence,
  };
};

const average = (values: number[]) => values.length
  ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  : null;

export function buildSkillMastery(
  definition: SkillDefinition,
  evidence: EvidenceEvent[],
  now = new Date(),
): SkillMastery {
  const capabilities = CAPABILITIES.map((capability) =>
    aggregateCapability(definition.skillId, capability, evidence, now));
  const measured = capabilities.filter(
    (item): item is CapabilityMastery & { estimate: number; lower: number; upper: number } =>
      item.estimate !== null && item.lower !== null && item.upper !== null,
  );
  const evidenceForSkill = evidence.filter((event) =>
    event.observations.some((observation) => observation.skillId === definition.skillId));
  const families = new Set(evidenceForSkill.map((event) => event.source.itemFamilyId));
  return {
    skillId: definition.skillId,
    label: definition.label,
    category: definition.category,
    estimate: average(measured.map((item) => item.estimate)),
    lower: average(measured.map((item) => item.lower)),
    upper: average(measured.map((item) => item.upper)),
    evidenceCount: evidenceForSkill.length,
    independentFamilyCount: families.size,
    transferEvidenceCount: evidenceForSkill.filter((event) => event.transferLevel !== "familiar").length,
    noAiEvidenceCount: evidenceForSkill.filter((event) => event.assistance.mode === "no_ai").length,
    latestEvidenceAt: evidenceForSkill.reduce<string | null>(
      (latest, event) => !latest || event.occurredAt > latest ? event.occurredAt : latest,
      null,
    ),
    confidence: measured.some((item) => item.confidence === "high")
      ? "high"
      : measured.some((item) => item.confidence === "medium")
        ? "medium"
        : "low",
    capabilities,
  };
}
