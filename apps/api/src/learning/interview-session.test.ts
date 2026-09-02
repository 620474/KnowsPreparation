import { describe, expect, it } from "vitest";

import {
  getReadinessConfidence,
  getInterviewQuestionCandidates,
  interviewDurationMinutes,
  selectInterviewExercises,
  selectInterviewQuestions,
  selectAdaptiveInterviewQuestion,
} from "./interview-session";

describe("interview session selection", () => {
  it("builds compact and full platform sections from distinct categories", () => {
    const express = selectInterviewQuestions("express", 0);
    const full = selectInterviewQuestions("full", 2);

    expect(express).toHaveLength(2);
    expect(full).toHaveLength(3);
    expect(new Set(full.map((question) => question.category)).size).toBe(3);
  });

  it("prefers company exercises and keeps coding tasks distinct", () => {
    const [coding, ai] = selectInterviewExercises("ozon", 0);

    expect(coding.id).not.toBe(ai.id);
    expect(coding.id).toMatch(/^ozon-/);
    expect(ai.id).toMatch(/^ozon-/);
    expect(coding.runner.testCases.length).toBeGreaterThan(0);
  });

  it("calculates duration and evidence confidence", () => {
    expect(interviewDurationMinutes("express")).toBe(35);
    expect(interviewDurationMinutes("full")).toBe(75);
    expect(interviewDurationMinutes("express", "exam")).toBe(60);
    expect(interviewDurationMinutes("full", "exam")).toBe(90);
    expect(getReadinessConfidence(0)).toBe("low");
    expect(getReadinessConfidence(2)).toBe("medium");
    expect(getReadinessConfidence(5)).toBe("high");
  });

  it("selects only an allowlisted adaptive next question", () => {
    const first = selectInterviewQuestions("express", 0)[0]!;
    const candidates = getInterviewQuestionCandidates([first.id], 0, 5);

    expect(selectAdaptiveInterviewQuestion(candidates, candidates[2]!.id)?.id)
      .toBe(candidates[2]!.id);
    expect(selectAdaptiveInterviewQuestion(candidates, "invented-question")?.id)
      .toBe(candidates[0]!.id);
  });
});
