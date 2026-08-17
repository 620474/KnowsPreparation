import { describe, expect, it } from "vitest";

import { normalizeQuestionProgress } from "./question-progress";
import { scheduleQuestionReview } from "./spaced-repetition";

const NOW = new Date("2026-08-18T12:00:00.000Z");

describe("scheduleQuestionReview", () => {
  it("keeps a mature hard question in learning", () => {
    const result = scheduleQuestionReview(
      normalizeQuestionProgress({ intervalDays: 40, repetitions: 5, status: "review" }),
      "hard",
      NOW,
    );

    expect(result.status).toBe("learning");
    expect(result.intervalDays).toBe(48);
  });
});
