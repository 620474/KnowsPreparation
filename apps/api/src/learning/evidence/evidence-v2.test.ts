import { describe, expect, it } from "vitest";

import { buildAssessmentResultV2 } from "./evidence-v2.service";

describe("evidence v2", () => {
  it("builds a stable native assessment with criterion provenance", () => {
    const draft = {
      operationId: "practice:operation-1",
      source: {
        kind: "practice_attempt" as const,
        itemId: "closures-practice",
        itemVersion: "task:1:hash",
        itemFamilyId: "practice:closures",
        track: "yandex" as const,
      },
      observations: [{
        criterionId: "runner-tests",
        rubricVersion: "quickjs-runner-v2",
        skillId: "javascript.closures",
        capability: "code" as const,
        score: 75,
        reliability: 1,
        weight: 1,
      }],
      transferLevel: "near_transfer" as const,
      assistance: { mode: "no_ai" as const, hintCount: 0, solutionViewed: false },
      evaluator: {
        type: "deterministic" as const,
        evaluatorVersion: "quickjs-runner-v2",
        model: null,
        promptVersion: null,
        schemaVersion: "2",
      },
      occurredAt: "2026-09-02T10:00:00.000Z",
    };
    const first = buildAssessmentResultV2(draft);
    const second = buildAssessmentResultV2(draft);

    expect(first.assessmentResultId).toBe(second.assessmentResultId);
    expect(first.observations[0]).toMatchObject({
      criterionId: "runner-tests",
      capability: "code",
      score: 75,
    });
  });
});
