import { describe, expect, it } from "vitest";

import { resolveVerificationOutcome } from "./learning-mission.service";
import {
  getTransferDefinition,
  getTransferDefinitionsForSkill,
} from "./transfer-lab";

describe("learning mission decision loop", () => {
  const now = new Date("2026-09-02T10:00:00.000Z");

  it("schedules an independent delayed verification after an immediate pass", () => {
    const result = resolveVerificationOutcome("immediate_verify", true, 1, now);
    expect(result.status).toBe("consolidation");
    expect(result.dueAt?.toISOString()).toBe("2026-09-05T10:00:00.000Z");
  });

  it("closes only after the delayed verification passes", () => {
    const result = resolveVerificationOutcome("delayed_verify", true, 2, now);
    expect(result.status).toBe("closed");
    expect(result.closedAt).toBe(now);
  });

  it("reopens after a failed delayed verification", () => {
    expect(resolveVerificationOutcome("delayed_verify", false, 2, now).status)
      .toBe("reopened");
  });

  it("uses different item families for immediate and delayed checks", () => {
    for (const skillId of [
      "async.event-loop",
      "react.hooks",
      "javascript.closures",
      "algorithms.arrays-hashmaps",
    ]) {
      const definitions = getTransferDefinitionsForSkill(skillId);
      expect(definitions).toHaveLength(2);
      expect(definitions[0]?.item.familyId).not.toBe(definitions[1]?.item.familyId);
    }
  });

  it("evaluates Transfer Lab answers deterministically", () => {
    const definition = getTransferDefinition("transfer-event-loop-1");
    expect(definition?.evaluate("A, F, C, E, D, B. Сначала sync, потом microtasks").score).toBe(100);
    expect(definition?.evaluate("A, B, C").score).toBeLessThan(70);
  });
});

