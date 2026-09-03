import {
  SKILL_ONTOLOGY_VERSION,
  type AdaptivePlanItem,
  type KnowledgeOverview,
} from "@prep/contracts";
import { describe, expect, it } from "vitest";

import {
  applyCrossTrackCoverage,
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

const overviewWithSkills = (
  skills: Array<{ skillId: string; estimate: number; lower: number }>,
): KnowledgeOverview => ({
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
  skills: skills.map((skill) => ({
    ...skill,
    label: skill.skillId,
    category: skill.skillId,
    upper: 95,
    evidenceCount: 3,
    independentFamilyCount: 2,
    transferEvidenceCount: 1,
    noAiEvidenceCount: 2,
    latestEvidenceAt: new Date().toISOString(),
    confidence: "medium",
    capabilities: [],
  })),
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

  it("does not schedule two theory items with the same skills from different tracks", () => {
    const primary = { ...candidate("avito-js", 100, 15), kind: "lesson" as const, track: "avito" as const };
    const duplicate = { ...candidate("yandex-js", 90, 20), kind: "plan" as const, track: "yandex" as const };

    const result = selectAdaptivePlanItems([duplicate, primary], 60);

    expect(result.map((item) => item.id)).toEqual(["avito-js"]);
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

  it("shortens a lesson to verification when all skills are proven in another track", () => {
    const lesson = {
      ...candidate("avito-js", 60, 40),
      kind: "lesson" as const,
      track: "avito" as const,
      source: "lesson" as const,
    };
    const overview = overviewWithSkills([{ skillId: "javascript", estimate: 84, lower: 68 }]);
    const [ranked] = applyMasteryPriority([lesson], overview);
    const [result] = applyCrossTrackCoverage([ranked!], overview, [{
      type: "practice_attempted",
      track: "yandex",
      skillKeys: ["javascript"],
      payload: { passedCount: 4, totalCount: 4, aiAssisted: false },
    }]);

    expect(result?.minutes).toBe(15);
    expect(result?.v6?.crossTrack).toEqual({
      mode: "verify",
      coveredSkillIds: ["javascript"],
      sourceTracks: ["yandex"],
    });
    expect(result?.v6?.reasonCodes).toContain("CROSS_TRACK_COVERAGE");
  });

  it("only annotates partial overlap without shortening the lesson", () => {
    const lesson = {
      ...candidate("tbank-platform", 60, 40),
      kind: "lesson" as const,
      track: "tbank" as const,
      source: "lesson" as const,
      skillKeys: ["javascript", "react"] as const,
    } satisfies AdaptivePlanItem;
    const overview = overviewWithSkills([
      { skillId: "javascript", estimate: 84, lower: 68 },
      { skillId: "react", estimate: 82, lower: 65 },
    ]);
    const [ranked] = applyMasteryPriority([lesson], overview);
    const [result] = applyCrossTrackCoverage([ranked!], overview, [{
      type: "quiz_submitted",
      track: "yandex",
      skillKeys: ["javascript"],
      payload: { score: 9, maxScore: 10, aiAssisted: false },
    }]);

    expect(result?.minutes).toBe(40);
    expect(result?.v6?.crossTrack?.mode).toBe("partial");
    expect(result?.v6?.crossTrack?.coveredSkillIds).toEqual(["javascript"]);
  });

  it("does not shorten a curriculum block without a generated quiz", () => {
    const plan = {
      ...candidate("curriculum-js", 55, 40),
      kind: "plan" as const,
      track: "curriculum" as const,
      source: null,
    };
    const overview = overviewWithSkills([{ skillId: "javascript", estimate: 84, lower: 68 }]);
    const [ranked] = applyMasteryPriority([plan], overview);
    const [result] = applyCrossTrackCoverage([ranked!], overview, [{
      type: "practice_attempted",
      track: "yandex",
      skillKeys: ["javascript"],
      payload: { passedCount: 4, totalCount: 4, aiAssisted: false },
    }]);

    expect(result?.minutes).toBe(40);
    expect(result?.v6?.crossTrack?.mode).toBe("partial");
  });

  it("keeps the full lesson when cross-track evidence is weak", () => {
    const lesson = {
      ...candidate("avito-js", 60, 40),
      kind: "lesson" as const,
      track: "avito" as const,
      source: "lesson" as const,
    };
    const overview = overviewWithSkills([{ skillId: "javascript", estimate: 84, lower: 68 }]);
    const [ranked] = applyMasteryPriority([lesson], overview);
    const [result] = applyCrossTrackCoverage([ranked!], overview, [{
      type: "practice_attempted",
      track: "yandex",
      skillKeys: ["javascript"],
      payload: { passedCount: 2, totalCount: 4, aiAssisted: false },
    }]);

    expect(result?.minutes).toBe(40);
    expect(result?.v6?.crossTrack).toBeUndefined();
  });
});
