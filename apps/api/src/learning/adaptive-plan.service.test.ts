import {
  SKILL_ONTOLOGY_VERSION,
  type AdaptivePlanItem,
  type KnowledgeOverview,
} from "@prep/contracts";
import { describe, expect, it } from "vitest";

import {
  applyMasteryPriority,
  applyReadinessPriority,
  selectAdaptivePlanItems,
} from "./adaptive-plan.service";

const candidate = (
  id: string,
  score: number,
  minutes: number,
): AdaptivePlanItem => ({
  id,
  kind: "practice",
  title: id,
  reason: "test",
  minutes,
  score,
  skillKeys: ["javascript"],
  track: "yandex",
  itemId: id,
  source: "task",
});

describe("selectAdaptivePlanItems", () => {
  it("fills the budget by priority without exceeding it", () => {
    const result = selectAdaptivePlanItems(
      [candidate("plan", 50, 60), candidate("failed", 100, 30), candidate("quiz", 80, 20)],
      50,
    );

    expect(result.map((item) => item.id)).toEqual(["failed", "quiz"]);
    expect(result.reduce((sum, item) => sum + item.minutes, 0)).toBe(50);
  });

  it("replaces a skipped recommendation with the next candidate", () => {
    const result = selectAdaptivePlanItems(
      [candidate("failed", 100, 30), candidate("quiz", 80, 20)],
      30,
      new Set(["failed"]),
    );

    expect(result.map((item) => item.id)).toEqual(["quiz"]);
  });

  it("raises evidence-backed weak skills above already strong skills", () => {
    const weak = candidate("weak", 60, 30);
    const strong: AdaptivePlanItem = {
      ...candidate("strong", 60, 30),
      skillKeys: ["react"],
    };
    const ranked = applyReadinessPriority(
      [weak, strong],
      new Map([
        ["javascript", { score: 30, signalCount: 3 }],
        ["react", { score: 90, signalCount: 3 }],
      ]),
      "mixed",
    );

    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
    expect(ranked[0]!.reason).toContain("дефицит 70%");
  });

  it("adds explainable v6 metadata for missing evidence", () => {
    const overview = {
      ontologyVersion: SKILL_ONTOLOGY_VERSION,
      masteryModelVersion: "test",
      generatedAt: new Date().toISOString(),
      readiness: {
        targetId: "general",
        targetLabel: "Frontend",
        estimate: null,
        lower: null,
        upper: null,
        coverage: 0,
        integrityCoverage: 0,
        evidenceCount: 0,
        confidence: "low",
      },
      skills: [{
        skillId: "javascript",
        label: "JavaScript",
        category: "JavaScript",
        estimate: null,
        lower: null,
        upper: null,
        evidenceCount: 0,
        independentFamilyCount: 0,
        transferEvidenceCount: 0,
        noAiEvidenceCount: 0,
        latestEvidenceAt: null,
        confidence: "low",
        capabilities: [],
      }],
    } satisfies KnowledgeOverview;
    const [ranked] = applyMasteryPriority([candidate("diagnostic", 50, 20)], overview);

    expect(ranked?.v6?.targetedSkillIds).toEqual(["javascript"]);
    expect(ranked?.v6?.reasonCodes).toContain("INSUFFICIENT_EVIDENCE");
    expect(ranked?.v6?.expectedInformationGain).toBe(80);
  });
});
