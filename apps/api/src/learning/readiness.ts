import type { SkillKey } from "@prep/contracts";

import type { LearningSignal } from "./schemas/learning-signal.schema";

export const READINESS_DIMENSIONS = ["recall", "code", "explain", "defend"] as const;
export type ReadinessDimension = (typeof READINESS_DIMENSIONS)[number];

const DAY_MS = 86_400_000;
const READINESS_HALF_LIFE_DAYS = 45;

interface ReadinessEvidence {
  key: string;
  occurredAt: Date;
  score: number;
  reliability: number;
}

export interface ReadinessMetric {
  score: number | null;
  signalCount: number;
  independentItemCount: number;
  latestEvidenceAt: string | null;
  confidence: "low" | "medium" | "high";
}

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const average = (values: number[]) =>
  values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;

const signalDate = (signal: LearningSignal) => {
  const date = signal.occurredAt ?? signal.createdAt;
  return date instanceof Date ? date : new Date(date ?? 0);
};

const evidenceKey = (signal: LearningSignal, dimension: ReadinessDimension) =>
  `${dimension}:${signal.type}:${signal.track ?? "global"}:${signal.itemId ?? signal.operationId}`;

const confidenceForWeight = (weight: number): ReadinessMetric["confidence"] =>
  weight >= 8 ? "high" : weight >= 3 ? "medium" : "low";

const aggregateEvidence = (
  evidence: ReadinessEvidence[],
  now: Date,
): ReadinessMetric => {
  const latestByKey = new Map<string, ReadinessEvidence>();
  for (const item of evidence) {
    const current = latestByKey.get(item.key);
    if (!current || item.occurredAt > current.occurredAt) latestByKey.set(item.key, item);
  }
  const independent = [...latestByKey.values()];
  if (!independent.length) {
    return {
      score: null,
      signalCount: 0,
      independentItemCount: 0,
      latestEvidenceAt: null,
      confidence: "low",
    };
  }
  let weightedScore = 0;
  let totalWeight = 0;
  let evidenceWeight = 0;
  for (const item of independent) {
    const ageDays = Math.max(0, now.getTime() - item.occurredAt.getTime()) / DAY_MS;
    const weight = (0.5 ** (ageDays / READINESS_HALF_LIFE_DAYS)) * item.reliability;
    weightedScore += item.score * weight;
    totalWeight += weight;
    evidenceWeight += item.reliability;
  }
  const latestEvidenceAt = independent.reduce(
    (latest, item) => item.occurredAt > latest ? item.occurredAt : latest,
    independent[0]!.occurredAt,
  );
  return {
    score: totalWeight ? clampScore(weightedScore / totalWeight) : null,
    signalCount: evidence.length,
    independentItemCount: independent.length,
    latestEvidenceAt: latestEvidenceAt.toISOString(),
    confidence: confidenceForWeight(evidenceWeight),
  };
};

export function readinessScoresForSignal(signal: LearningSignal) {
  const scores: Partial<Record<ReadinessDimension, number>> = {};
  if (signal.type === "question_reviewed") {
    const rating = signal.payload.rating;
    scores.recall = rating === "again" ? 0 : rating === "hard" ? 40 : rating === "good" ? 75 : 100;
  } else if (signal.type === "question_attempted") {
    const score = numberValue(signal.payload.score);
    const capabilities = Array.isArray(signal.payload.capabilities)
      ? signal.payload.capabilities
      : [];
    if (score !== null) {
      if (capabilities.includes("recall") || capabilities.includes("apply")) {
        scores.recall = clampScore(score);
      }
      if (capabilities.includes("debug") || capabilities.includes("code")) {
        scores.code = clampScore(score);
      }
      if (capabilities.includes("explain")) scores.explain = clampScore(score);
      if (capabilities.includes("defend")) scores.defend = clampScore(score);
    }
  } else if (signal.type === "quiz_submitted") {
    const score = numberValue(signal.payload.score);
    const maxScore = numberValue(signal.payload.maxScore);
    if (score !== null && maxScore) scores.recall = clampScore((score / maxScore) * 100);
  } else if (signal.type === "practice_attempted") {
    const passed = numberValue(signal.payload.passedCount);
    const total = numberValue(signal.payload.totalCount);
    if (passed !== null && total) {
      let score = (passed / total) * 100;
      const runCount = numberValue(signal.payload.runCount);
      const attemptNumber = numberValue(signal.payload.attemptNumber);
      const hintCount = numberValue(signal.payload.hintCount);
      const responseTimeMs = numberValue(signal.payload.responseTimeMs);
      if (runCount && runCount > 1) score -= Math.min(20, (runCount - 1) * 5);
      if (attemptNumber && attemptNumber > 1) score -= Math.min(15, (attemptNumber - 1) * 5);
      if (hintCount && hintCount > 0) score -= Math.min(18, hintCount * 6);
      if (signal.payload.firstAttemptPassed === false) score -= 8;
      if (signal.payload.aiAssisted === true) score -= 20;
      if (responseTimeMs && responseTimeMs > 40 * 60_000) score -= 10;
      else if (responseTimeMs && responseTimeMs > 20 * 60_000) score -= 5;
      const confidence = numberValue(signal.payload.confidence);
      if (confidence !== null && confidence >= 4 && passed / total < 0.6) score -= 5;
      scores.code = clampScore(score);
    }
  } else if (signal.type === "mock_completed") {
    const overall = numberValue(signal.payload.score);
    const sections = signal.payload.sections;
    if (sections && typeof sections === "object") {
      const sectionRecord = sections as Record<string, unknown>;
      const coding = numberValue(sectionRecord.coding);
      const platform = numberValue(sectionRecord.platform);
      const communication = numberValue(sectionRecord.communication);
      if (coding !== null) scores.code = clampScore(coding);
      if (platform !== null || communication !== null) {
        scores.explain = average([platform, communication].filter((value): value is number => value !== null)) ?? undefined;
      }
      if (communication !== null) scores.defend = clampScore(communication);
    } else if (overall !== null) {
      scores.explain = clampScore(overall);
      scores.defend = clampScore(overall);
    }
  }
  return scores;
}

export function buildReadiness(signals: LearningSignal[], now = new Date()) {
  const dimensionEvidence = Object.fromEntries(
    READINESS_DIMENSIONS.map((dimension) => [dimension, [] as ReadinessEvidence[]]),
  ) as Record<ReadinessDimension, ReadinessEvidence[]>;
  const skillEvidence = new Map<SkillKey, ReadinessEvidence[]>();

  for (const signal of signals) {
    const scores = readinessScoresForSignal(signal);
    const occurredAt = signalDate(signal);
    const reliability = signal.type === "question_reviewed"
      ? 0.2
      : Math.max(0.1, Math.min(1, numberValue(signal.payload.reliability) ?? 1));
    for (const dimension of READINESS_DIMENSIONS) {
      const score = scores[dimension];
      if (score === undefined) continue;
      const evidence = { key: evidenceKey(signal, dimension), occurredAt, score, reliability };
      dimensionEvidence[dimension].push(evidence);
      for (const skill of signal.skillKeys) {
        const current = skillEvidence.get(skill) ?? [];
        current.push({ ...evidence, key: `${skill}:${evidence.key}` });
        skillEvidence.set(skill, current);
      }
    }
  }

  return {
    dimensions: Object.fromEntries(
      READINESS_DIMENSIONS.map((dimension) => [
        dimension,
        aggregateEvidence(dimensionEvidence[dimension], now),
      ]),
    ) as Record<ReadinessDimension, ReadinessMetric>,
    skills: new Map(
      [...skillEvidence.entries()].map(([skill, evidence]) => [
        skill,
        aggregateEvidence(evidence, now),
      ]),
    ),
  };
}
