import {
  EVIDENCE_EVENT_VERSION,
  SKILL_ONTOLOGY_VERSION,
  type EvidenceEventV2,
  type SkillDefinition,
} from "@prep/contracts";
import { describe, expect, it } from "vitest";

import { replaySkillMasteryV2 } from "./mastery-v2-calculator";

const definition: SkillDefinition = {
  ontologyVersion: SKILL_ONTOLOGY_VERSION,
  skillId: "react.hooks",
  label: "React Hooks",
  description: "Hooks",
  category: "React",
  legacySkillKey: "react",
  parentSkillId: "react",
  prerequisites: [],
  relatedSkillIds: [],
};

const evidence = (
  operationId: string,
  family: string,
  capability: EvidenceEventV2["observations"][number]["capability"],
  score = 100,
): EvidenceEventV2 => ({
  eventId: operationId,
  operationId,
  evidenceVersion: EVIDENCE_EVENT_VERSION,
  ontologyVersion: SKILL_ONTOLOGY_VERSION,
  assessmentResultId: operationId,
  source: {
    kind: "practice_attempt",
    entityId: operationId,
    itemId: operationId,
    itemVersion: "2",
    itemFamilyId: family,
    track: "yandex",
  },
  observations: [{
    criterionId: `${operationId}:${capability}`,
    rubricVersion: "test-v2",
    skillId: definition.skillId,
    capability,
    score,
    reliability: 1,
    weight: 1,
  }],
  transferLevel: "near_transfer",
  assistance: { mode: "no_ai", hintCount: 0, solutionViewed: false },
  evaluator: {
    type: "deterministic",
    evaluatorVersion: "test-v2",
    model: null,
    promptVersion: null,
    schemaVersion: "2",
  },
  provenance: { kind: "native", sourceEventId: null },
  occurredAt: "2026-09-02T10:00:00.000Z",
});

describe("mastery v2 replay", () => {
  it("keeps missing required capabilities visible and confidence low", () => {
    const mastery = replaySkillMasteryV2(
      definition,
      [evidence("1", "family-1", "recall")],
      new Date("2026-09-02T11:00:00.000Z"),
    );

    expect(mastery.capabilityCoverage).toBe(20);
    expect(mastery.unknownCapabilities).toEqual(["explain", "apply", "debug", "code"]);
    expect(mastery.confidence).toBe("low");
    expect(mastery.estimate).toBeLessThan(70);
    expect(mastery.upper - mastery.lower).toBeGreaterThan(50);
  });

  it("is deterministic when evidence arrives out of order", () => {
    const events = [
      evidence("1", "family-1", "recall", 80),
      evidence("2", "family-2", "explain", 70),
      evidence("3", "family-3", "apply", 90),
    ];
    const now = new Date("2026-09-02T11:00:00.000Z");

    expect(replaySkillMasteryV2(definition, events, now))
      .toEqual(replaySkillMasteryV2(definition, [...events].reverse(), now));
  });

  it("counts only the latest evidence from one item family", () => {
    const mastery = replaySkillMasteryV2(definition, [
      evidence("1", "same-family", "code", 20),
      { ...evidence("2", "same-family", "code", 100), occurredAt: "2026-09-02T10:30:00.000Z" },
    ], new Date("2026-09-02T11:00:00.000Z"));
    const code = mastery.capabilities.find((item) => item.capability === "code");

    expect(code?.independentFamilyCount).toBe(1);
    expect(code?.estimate).toBe(69);
  });
});
