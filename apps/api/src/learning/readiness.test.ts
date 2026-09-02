import { describe, expect, it } from "vitest";

import { buildReadiness, readinessScoresForSignal } from "./readiness";
import type { LearningSignal } from "./schemas/learning-signal.schema";

const signal = (
  type: LearningSignal["type"],
  payload: Record<string, unknown>,
  skillKeys: LearningSignal["skillKeys"] = ["javascript"],
) => ({ type, payload, skillKeys } as LearningSignal);

describe("readiness evidence", () => {
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
    ]);

    expect(readiness.dimensions.recall.score).toBe(80);
    expect(readiness.dimensions.code.score).toBe(68);
    expect(readiness.dimensions.explain.score).toBe(65);
    expect(readiness.dimensions.defend.score).toBe(50);
    expect(readiness.skills.get("javascript")?.signalCount).toBe(5);
  });
});
