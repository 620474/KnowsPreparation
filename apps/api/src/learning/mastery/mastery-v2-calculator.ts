import {
  MASTERY_MODEL_V2_VERSION,
  type CapabilityMasteryV2,
  type EvidenceEventV2,
  type SkillCapability,
  type SkillDefinition,
  type SkillMasteryV2,
} from "@prep/contracts";

export { MASTERY_MODEL_V2_VERSION };

const DAY_MS = 86_400_000;
const HALF_LIFE_DAYS = 45;
const UNKNOWN_PRIOR = 50;
const CAPABILITIES: SkillCapability[] = ["recall", "explain", "apply", "debug", "code", "defend"];

const REQUIRED_BY_ROOT: Record<string, SkillCapability[]> = {
  javascript: ["recall", "explain", "apply", "debug", "code"],
  typescript: ["recall", "explain", "apply", "debug", "code"],
  async: ["recall", "explain", "apply", "debug", "code"],
  react: ["recall", "explain", "apply", "debug", "code"],
  browser: ["recall", "explain", "apply", "debug"],
  algorithms: ["explain", "apply", "code"],
  testing: ["recall", "explain", "apply", "debug", "code"],
  architecture: ["recall", "explain", "apply", "defend"],
  "css-a11y": ["recall", "explain", "apply", "code"],
  ai: ["recall", "explain", "apply", "defend"],
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

export const requiredCapabilitiesForSkill = (definition: SkillDefinition) =>
  REQUIRED_BY_ROOT[definition.legacySkillKey] ?? ["recall", "explain", "apply"];

const aggregateCapability = (
  skillId: string,
  capability: SkillCapability,
  required: boolean,
  evidence: EvidenceEventV2[],
  now: Date,
): CapabilityMasteryV2 => {
  const latestByFamily = new Map<string, {
    event: EvidenceEventV2;
    observations: EvidenceEventV2["observations"];
  }>();
  for (const event of evidence) {
    const observations = event.observations.filter(
      (item) => item.skillId === skillId && item.capability === capability,
    );
    if (!observations.length) continue;
    const familyId = event.source.itemFamilyId;
    const current = latestByFamily.get(familyId);
    if (!current || event.occurredAt > current.event.occurredAt) {
      latestByFamily.set(familyId, { event, observations });
    }
  }
  const independent = [...latestByFamily.values()];
  if (!independent.length) {
    return {
      capability,
      required,
      estimate: null,
      lower: 0,
      upper: 100,
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
  for (const { event, observations } of independent) {
    const criterionWeight = observations.reduce((sum, item) => sum + item.weight, 0);
    const score = criterionWeight
      ? observations.reduce((sum, item) => sum + item.score * item.weight, 0) / criterionWeight
      : 0;
    const reliability = criterionWeight
      ? observations.reduce((sum, item) => sum + item.reliability * item.weight, 0) / criterionWeight
      : 0;
    const ageDays = Math.max(0, now.getTime() - new Date(event.occurredAt).getTime()) / DAY_MS;
    const freshness = 0.5 ** (ageDays / HALF_LIFE_DAYS);
    const assistanceWeight = event.assistance.mode === "ai_assisted" ? 0.7 : 1;
    const weight = reliability * freshness * assistanceWeight;
    weightedScore += score * weight;
    totalWeight += weight;
  }
  const transferEvidenceCount = independent.filter(
    ({ event }) => event.transferLevel !== "familiar",
  ).length;
  const noAiEvidenceCount = independent.filter(
    ({ event }) => event.assistance.mode === "no_ai",
  ).length;
  let estimate = totalWeight ? weightedScore / totalWeight : UNKNOWN_PRIOR;
  if (independent.length < 3) estimate = Math.min(estimate, 69);
  if (["apply", "debug", "code", "defend"].includes(capability) && transferEvidenceCount === 0) {
    estimate = Math.min(estimate, 79);
  }
  const uncertainty = Math.max(8, Math.min(32, 32 / Math.sqrt(Math.max(0.25, totalWeight))));
  const latestEvidenceAt = independent.reduce(
    (latest, item) => item.event.occurredAt > latest ? item.event.occurredAt : latest,
    independent[0]!.event.occurredAt,
  );
  const confidence = independent.length >= 6 && totalWeight >= 4.5 && transferEvidenceCount > 0
    ? "high"
    : independent.length >= 3 && totalWeight >= 2
      ? "medium"
      : "low";
  return {
    capability,
    required,
    estimate: clamp(estimate),
    lower: clamp(estimate - uncertainty),
    upper: clamp(estimate + uncertainty),
    evidenceCount: independent.reduce((sum, item) => sum + item.observations.length, 0),
    independentFamilyCount: independent.length,
    transferEvidenceCount,
    noAiEvidenceCount,
    latestEvidenceAt,
    confidence,
  };
};

export function replaySkillMasteryV2(
  definition: SkillDefinition,
  evidence: EvidenceEventV2[],
  now = new Date(),
): SkillMasteryV2 {
  const requiredCapabilities = requiredCapabilitiesForSkill(definition);
  const capabilities = CAPABILITIES.map((capability) => aggregateCapability(
    definition.skillId,
    capability,
    requiredCapabilities.includes(capability),
    evidence,
    now,
  ));
  const required = capabilities.filter((item) => item.required);
  const measuredRequired = required.filter(
    (item): item is CapabilityMasteryV2 & { estimate: number } => item.estimate !== null,
  );
  const unknownCapabilities = required
    .filter((item) => item.estimate === null)
    .map((item) => item.capability);
  const capabilityCoverage = Math.round((measuredRequired.length / required.length) * 100);
  const estimates = required.map((item) => item.estimate ?? UNKNOWN_PRIOR);
  const lower = required.map((item) => item.estimate === null ? 0 : item.lower);
  const upper = required.map((item) => item.estimate === null ? 100 : item.upper);
  const evidenceForSkill = evidence.filter((event) =>
    event.observations.some((observation) => observation.skillId === definition.skillId));
  const families = new Set(evidenceForSkill.map((event) => event.source.itemFamilyId));
  const confidence = required.every((item) => item.confidence === "high")
    ? "high"
    : capabilityCoverage >= 60 && required.every(
      (item) => item.estimate === null || item.confidence !== "low",
    )
      ? "medium"
      : "low";
  return {
    skillId: definition.skillId,
    label: definition.label,
    category: definition.category,
    estimate: clamp(average(estimates)),
    lower: clamp(average(lower)),
    upper: clamp(average(upper)),
    capabilityCoverage,
    requiredCapabilities,
    unknownCapabilities,
    evidenceCount: evidenceForSkill.length,
    independentFamilyCount: families.size,
    transferEvidenceCount: evidenceForSkill.filter((event) => event.transferLevel !== "familiar").length,
    noAiEvidenceCount: evidenceForSkill.filter((event) => event.assistance.mode === "no_ai").length,
    latestEvidenceAt: evidenceForSkill.reduce<string | null>(
      (latest, event) => !latest || event.occurredAt > latest ? event.occurredAt : latest,
      null,
    ),
    confidence,
    capabilities,
  };
}
