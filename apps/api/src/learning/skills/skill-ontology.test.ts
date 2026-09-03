import { describe, expect, it } from "vitest";

import { SKILL_ONTOLOGY, validateSkillOntology } from "./skill-ontology";

describe("skill ontology", () => {
  it("contains a reviewed, acyclic frontend graph", () => {
    expect(validateSkillOntology()).toBe(true);
    expect(SKILL_ONTOLOGY.length).toBeGreaterThanOrEqual(30);
    expect(new Set(SKILL_ONTOLOGY.map((skill) => skill.skillId)).size)
      .toBe(SKILL_ONTOLOGY.length);
  });

  it("keeps every child connected to an existing root", () => {
    const ids = new Set(SKILL_ONTOLOGY.map((skill) => skill.skillId));
    for (const skill of SKILL_ONTOLOGY) {
      if (skill.parentSkillId) expect(ids.has(skill.parentSkillId)).toBe(true);
    }
  });

  it("tracks frontend performance evidence separately from rendering knowledge", () => {
    expect(SKILL_ONTOLOGY.find(
      (skill) => skill.skillId === "browser.performance-observability",
    )).toMatchObject({
      parentSkillId: "browser",
      legacySkillKey: "browser",
    });
  });
});
