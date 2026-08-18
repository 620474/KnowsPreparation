import { describe, expect, it } from "vitest";

import {
  normalizeInterviewDefenseQuestions,
  normalizeInterviewEvaluation,
  normalizeInterviewFollowUp,
} from "./interview-session-ai";

describe("interview AI normalization", () => {
  it("normalizes follow-up and defense questions", () => {
    expect(normalizeInterviewFollowUp({ question: "  Почему?  " })).toBe("Почему?");
    expect(normalizeInterviewDefenseQuestions({ questions: ["Первый?", "Второй?"] }))
      .toEqual(["Первый?", "Второй?"]);
    expect(() => normalizeInterviewDefenseQuestions({ questions: ["Один?"] })).toThrow();
  });

  it("clamps scores and rejects incomplete evaluations", () => {
    const evaluation = normalizeInterviewEvaluation({
      platformScore: 140,
      aiScore: 72.4,
      communicationScore: -5,
      summary: "Итог",
      strengths: ["JS"],
      weakTopics: ["React"],
      recommendations: ["Повторить"],
      platformFeedback: "Точно",
      aiFeedback: "Осознанно",
      communicationFeedback: "Структурно",
    });
    expect(evaluation).toMatchObject({
      platformScore: 100,
      aiScore: 72,
      communicationScore: 0,
    });
    expect(() => normalizeInterviewEvaluation({ summary: "Итог" })).toThrow();
  });
});
