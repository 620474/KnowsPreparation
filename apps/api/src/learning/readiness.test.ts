import { describe, expect, it } from "vitest";

import { buildReadiness, readinessScoresForSignal } from "./readiness";
import type { LearningSignal } from "./schemas/learning-signal.schema";

const signal = (
  type: LearningSignal["type"],
  payload: Record<string, unknown>,
  skillKeys: LearningSignal["skillKeys"] = ["javascript"],
  options: Partial<LearningSignal> = {},
) => ({
  type,
  payload,
  skillKeys,
  operationId: `${type}-${Math.random()}`,
  occurredAt: new Date("2026-09-01T12:00:00.000Z"),
  ...options,
} as LearningSignal);

describe("readiness evidence", () => {
  it("uses objective question attempts across their measured capabilities", () => {
    expect(readinessScoresForSignal(signal("question_attempted", {
      score: 84,
      capabilities: ["recall", "debug", "explain"],
      reliability: 1,
    }))).toEqual({ recall: 84, code: 84, explain: 84 });
  });

  it("keeps legacy self-ratings as low-confidence evidence", () => {
    const readiness = buildReadiness(
      Array.from({ length: 8 }, (_, index) => signal(
        "question_reviewed",
        { rating: "easy" },
        ["javascript"],
        { itemId: `legacy-${index}` },
      )),
    );
    expect(readiness.dimensions.recall.score).toBe(69);
    expect(readiness.dimensions.recall.sufficientEvidence).toBe(false);
    expect(readiness.dimensions.recall.confidence).toBe("low");
  });

  it("penalizes repeated and AI-assisted coding attempts", () => {
    expect(readinessScoresForSignal(signal("practice_attempted", {
      passedCount: 4,
      totalCount: 4,
      runCount: 3,
      aiAssisted: true,
    }))).toEqual({ code: 70 });
  });

  it("keeps recall, code, explanation and defense separate", () => {
    const readiness = buildReadiness([
      signal("quiz_submitted", { score: 8, maxScore: 10 }),
      signal("practice_attempted", { passedCount: 3, totalCount: 4 }),
      signal("mock_completed", {
        score: 70,
        sections: { platform: 80, coding: 60, communication: 50 },
      }),
    ], new Date("2026-09-01T12:00:00.000Z"));

    expect(readiness.dimensions.recall.score).toBe(69);
    expect(readiness.dimensions.code.score).toBe(68);
    expect(readiness.dimensions.explain.score).toBe(65);
    expect(readiness.dimensions.defend.score).toBe(50);
    expect(readiness.skills.get("javascript")?.signalCount).toBe(5);
  });

  it("uses only deterministic sections when interview AI is unavailable", () => {
    expect(readinessScoresForSignal(signal("mock_completed", {
      score: 100,
      assessmentSource: "deterministic",
      sections: {
        platform: null,
        coding: 75,
        ai: 100,
        communication: null,
      },
    }))).toEqual({ code: 75 });
  });

  it("uses the latest result for repeated evidence from one item", () => {
    const readiness = buildReadiness([
      signal("quiz_submitted", { score: 2, maxScore: 10 }, ["javascript"], {
        itemId: "lesson-1",
        occurredAt: new Date("2026-08-01T12:00:00.000Z"),
      }),
      signal("quiz_submitted", { score: 9, maxScore: 10 }, ["javascript"], {
        itemId: "lesson-1",
        occurredAt: new Date("2026-09-01T12:00:00.000Z"),
      }),
    ], new Date("2026-09-01T12:00:00.000Z"));

    expect(readiness.dimensions.recall.score).toBe(69);
    expect(readiness.dimensions.recall.signalCount).toBe(2);
    expect(readiness.dimensions.recall.independentItemCount).toBe(1);
    expect(readiness.dimensions.recall.sufficientEvidence).toBe(false);
  });

  it("decays old independent evidence", () => {
    const readiness = buildReadiness([
      signal("quiz_submitted", { score: 100, maxScore: 100 }, ["javascript"], {
        itemId: "old",
        occurredAt: new Date("2026-06-03T12:00:00.000Z"),
      }),
      signal("quiz_submitted", { score: 40, maxScore: 100 }, ["javascript"], {
        itemId: "recent",
        occurredAt: new Date("2026-09-01T12:00:00.000Z"),
      }),
    ], new Date("2026-09-01T12:00:00.000Z"));

    expect(readiness.dimensions.recall.score).toBe(52);
    expect(readiness.dimensions.recall.confidence).toBe("low");
  });

  it("penalizes hints, later attempts and overconfidence", () => {
    expect(readinessScoresForSignal(signal("practice_attempted", {
      passedCount: 2,
      totalCount: 4,
      runCount: 2,
      attemptNumber: 2,
      hintCount: 2,
      firstAttemptPassed: false,
      confidence: 5,
    }))).toEqual({ code: 15 });
  });

  it("removes the readiness cap only after independent evidence across days", () => {
    const readiness = buildReadiness([
      signal("quiz_submitted", { score: 9, maxScore: 10 }, ["javascript"], {
        itemId: "lesson-1:core",
        occurredAt: new Date("2026-08-30T12:00:00.000Z"),
      }),
      signal("quiz_submitted", { score: 8, maxScore: 10 }, ["javascript"], {
        itemId: "lesson-2:core",
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
      }),
      signal("quiz_submitted", { score: 10, maxScore: 10 }, ["javascript"], {
        itemId: "lesson-3:deep",
        occurredAt: new Date("2026-09-01T12:00:00.000Z"),
      }),
    ], new Date("2026-09-01T12:00:00.000Z"));

    expect(readiness.dimensions.recall.score).toBeGreaterThan(69);
    expect(readiness.dimensions.recall.evidenceDayCount).toBe(2);
    expect(readiness.dimensions.recall.sufficientEvidence).toBe(true);
  });
});
