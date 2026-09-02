import {
  ASSESSMENT_EVENT_V3_VERSION,
  SKILL_ONTOLOGY_VERSION,
  type AssessmentEventV3,
  type SkillDefinition,
} from "@prep/contracts";
import { describe, expect, it } from "vitest";

import { replaySkillMasteryV3 } from "./mastery-v3-calculator";

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
  id: string,
  formId: string,
  contextFamilyId: string,
  score: number,
): AssessmentEventV3 => ({
  eventId: id,
  operationId: id,
  schemaVersion: ASSESSMENT_EVENT_V3_VERSION,
  ontologyVersion: SKILL_ONTOLOGY_VERSION,
  targetId: "general",
  source: {
    kind: "practice_attempt",
    entityId: id,
    taskId: "hooks-practice",
    taskVersion: "1",
    conceptFamilyId: "react-hooks",
    formId,
    contextFamilyId,
    track: "curriculum",
  },
  conditions: { aiMode: "none", hintCount: 0, timed: true, timeLimitMs: 600_000 },
  process: { durationMs: 120_000, runCount: 2, failedTestCount: 1, revisionCount: 2 },
  observations: [{
    criterionId: `${id}:apply`,
    skillId: definition.skillId,
    capability: "apply",
    score,
    difficulty: 3,
    reliability: 1,
    rubricVersion: "test-v3",
  }],
  assistance: { mode: "no_ai", hintCount: 0, solutionViewed: false },
  evaluator: {
    type: "deterministic",
    model: null,
    evaluatorVersion: "test-v3",
    promptVersion: null,
    schemaVersion: "3",
  },
  provenance: { kind: "native", sourceEventId: null },
  occurredAt: "2026-09-02T10:00:00.000Z",
});

describe("mastery v3 replay", () => {
  it("keeps untested capabilities explicitly unknown", () => {
    const mastery = replaySkillMasteryV3(definition, [], new Date("2026-09-02T11:00:00.000Z"));

    expect(mastery.coverage).toBe(0);
    expect(mastery.unknownCapabilities).toEqual(
      expect.arrayContaining(["design", "code", "debug"]),
    );
  });

  it("deduplicates one form and rewards independent contexts", () => {
    const mastery = replaySkillMasteryV3(definition, [
      evidence("old", "same-form", "component", 20),
      { ...evidence("new", "same-form", "component", 90), occurredAt: "2026-09-02T10:30:00.000Z" },
      evidence("other", "other-form", "application", 80),
    ], new Date("2026-09-02T11:00:00.000Z"));
    const apply = mastery.capabilities.find((item) => item.capability === "apply");

    expect(apply?.evidenceCount).toBe(2);
    expect(apply?.independentContextCount).toBe(2);
    expect(apply?.posteriorMean).toBeGreaterThan(60);
  });
});
