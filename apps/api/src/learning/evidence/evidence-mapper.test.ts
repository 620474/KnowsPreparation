import { describe, expect, it } from "vitest";

import type { LearningSignal } from "../schemas/learning-signal.schema";
import { mapSignalToEvidence } from "./evidence-mapper";

const signal = (operationId = "question-attempt:1") => ({
  type: "question_attempted",
  track: null,
  itemId: "closures-question",
  skillKeys: ["javascript"],
  payload: {
    capabilities: ["apply", "debug"],
    score: 84,
    reliability: 1,
  },
  operationId,
  occurredAt: new Date("2026-09-02T10:00:00.000Z"),
  createdAt: new Date("2026-09-02T10:00:00.000Z"),
  updatedAt: new Date("2026-09-02T10:00:00.000Z"),
} as LearningSignal);

describe("evidence mapper", () => {
  it("preserves canonical capabilities and maps a specific skill", () => {
    const evidence = mapSignalToEvidence(signal());
    expect(evidence?.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ skillId: "javascript.closures", capability: "apply", score: 84 }),
      expect.objectContaining({ skillId: "javascript.closures", capability: "debug", score: 84 }),
      expect.objectContaining({ skillId: "javascript", capability: "apply", score: 84 }),
    ]));
  });

  it("generates a stable event identity from operationId", () => {
    expect(mapSignalToEvidence(signal())?.eventId)
      .toBe(mapSignalToEvidence(signal())?.eventId);
    expect(mapSignalToEvidence(signal("question-attempt:2"))?.eventId)
      .not.toBe(mapSignalToEvidence(signal())?.eventId);
  });
});
