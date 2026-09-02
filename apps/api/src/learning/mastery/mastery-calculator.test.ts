import { describe, expect, it } from "vitest";
import {
  SKILL_ONTOLOGY_VERSION,
  type EvidenceEvent,
  type SkillDefinition,
} from "@prep/contracts";

import { buildSkillMastery } from "./mastery-calculator";

const definition: SkillDefinition = {
  ontologyVersion: SKILL_ONTOLOGY_VERSION,
  skillId: "async.event-loop",
  label: "Event loop",
  description: "Очереди задач",
  category: "Асинхронность",
  legacySkillKey: "async",
  parentSkillId: "async",
  prerequisites: [],
  relatedSkillIds: [],
};

const evidence = (
  operationId: string,
  family: string,
  transferLevel: EvidenceEvent["transferLevel"] = "familiar",
): EvidenceEvent => ({
  eventId: operationId,
  operationId,
  ontologyVersion: SKILL_ONTOLOGY_VERSION,
  source: {
    kind: "question_attempt",
    entityId: operationId,
    itemId: operationId,
    itemVersion: "1",
    itemFamilyId: family,
    track: "yandex",
  },
  observations: [{
    skillId: definition.skillId,
    capability: "apply",
    score: 100,
    reliability: 1,
  }],
  transferLevel,
  assistance: { mode: "no_ai", hintCount: 0, solutionViewed: false },
  evaluator: {
    type: "deterministic",
    evaluatorVersion: "test",
    model: null,
    promptVersion: null,
    schemaVersion: null,
  },
  occurredAt: "2026-09-02T10:00:00.000Z",
});

describe("mastery calculator", () => {
  it("does not award high mastery for repetitions from one family", () => {
    const mastery = buildSkillMastery(definition, [
      evidence("1", "same"),
      evidence("2", "same"),
      evidence("3", "same"),
    ], new Date("2026-09-02T11:00:00.000Z"));
    const apply = mastery.capabilities.find((item) => item.capability === "apply");
    expect(apply?.independentFamilyCount).toBe(1);
    expect(apply?.estimate).toBe(69);
  });

  it("recognizes independent transfer evidence", () => {
    const mastery = buildSkillMastery(definition, [
      evidence("1", "family-1"),
      evidence("2", "family-2", "near_transfer"),
      evidence("3", "family-3", "far_transfer"),
    ], new Date("2026-09-02T11:00:00.000Z"));
    const apply = mastery.capabilities.find((item) => item.capability === "apply");
    expect(apply?.independentFamilyCount).toBe(3);
    expect(apply?.transferEvidenceCount).toBe(2);
    expect(apply?.estimate).toBe(100);
  });
});
