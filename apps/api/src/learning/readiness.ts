import type { SkillKey } from "@prep/contracts";

import type { LearningSignal } from "./schemas/learning-signal.schema";

export const READINESS_DIMENSIONS = ["recall", "code", "explain", "defend"] as const;
export type ReadinessDimension = (typeof READINESS_DIMENSIONS)[number];

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const average = (values: number[]) =>
  values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;

export function readinessScoresForSignal(signal: LearningSignal) {
  const scores: Partial<Record<ReadinessDimension, number>> = {};
  if (signal.type === "question_reviewed") {
    const rating = signal.payload.rating;
    scores.recall = rating === "again" ? 0 : rating === "hard" ? 40 : rating === "good" ? 75 : 100;
  } else if (signal.type === "quiz_submitted") {
    const score = numberValue(signal.payload.score);
    const maxScore = numberValue(signal.payload.maxScore);
    if (score !== null && maxScore) scores.recall = Math.round((score / maxScore) * 100);
  } else if (signal.type === "practice_attempted") {
    const passed = numberValue(signal.payload.passedCount);
    const total = numberValue(signal.payload.totalCount);
    if (passed !== null && total) {
      let score = Math.round((passed / total) * 100);
      const runCount = numberValue(signal.payload.runCount);
      if (runCount && runCount > 1) score -= Math.min(20, (runCount - 1) * 5);
      if (signal.payload.aiAssisted === true) score -= 20;
      scores.code = Math.max(0, score);
    }
  } else if (signal.type === "mock_completed") {
    const overall = numberValue(signal.payload.score);
    const sections = signal.payload.sections;
    if (sections && typeof sections === "object") {
      const sectionRecord = sections as Record<string, unknown>;
      const coding = numberValue(sectionRecord.coding);
      const platform = numberValue(sectionRecord.platform);
      const communication = numberValue(sectionRecord.communication);
      if (coding !== null) scores.code = coding;
      if (platform !== null || communication !== null) {
        scores.explain = average([platform, communication].filter((value): value is number => value !== null)) ?? undefined;
      }
      if (communication !== null) scores.defend = communication;
    } else if (overall !== null) {
      scores.explain = overall;
      scores.defend = overall;
    }
  }
  return scores;
}

export function buildReadiness(signals: LearningSignal[]) {
  const dimensionValues = Object.fromEntries(
    READINESS_DIMENSIONS.map((dimension) => [dimension, [] as number[]]),
  ) as Record<ReadinessDimension, number[]>;
  const skillValues = new Map<SkillKey, number[]>();

  for (const signal of signals) {
    const scores = readinessScoresForSignal(signal);
    const values = Object.values(scores);
    for (const dimension of READINESS_DIMENSIONS) {
      const score = scores[dimension];
      if (score !== undefined) dimensionValues[dimension].push(score);
    }
    for (const skill of signal.skillKeys) {
      const current = skillValues.get(skill) ?? [];
      current.push(...values);
      skillValues.set(skill, current);
    }
  }

  return {
    dimensions: Object.fromEntries(
      READINESS_DIMENSIONS.map((dimension) => [dimension, {
        score: average(dimensionValues[dimension]),
        signalCount: dimensionValues[dimension].length,
      }]),
    ) as Record<ReadinessDimension, { score: number | null; signalCount: number }>,
    skills: new Map(
      [...skillValues.entries()].map(([skill, values]) => [skill, {
        score: average(values),
        signalCount: values.length,
      }]),
    ),
  };
}
