import { describe, expect, it } from "vitest";

import { scheduleQuestionReview } from "./spaced-repetition";

const NOW = new Date("2026-08-18T12:00:00.000Z");

describe("scheduleQuestionReview", () => {
  it("schedules a new remembered question for tomorrow", () => {
    const result = scheduleQuestionReview({}, "good", NOW);

    expect(result.status).toBe("review");
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.nextReviewAt.toISOString()).toBe("2026-08-19T12:00:00.000Z");
  });

  it("resets repetitions and records a lapse", () => {
    const result = scheduleQuestionReview(
      { easeFactor: 2.5, intervalDays: 12, repetitions: 3, reviewCount: 4 },
      "again",
      NOW,
    );

    expect(result.status).toBe("learning");
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.lapseCount).toBe(1);
    expect(result.reviewCount).toBe(5);
  });

  it("marks a question mastered after a long easy interval", () => {
    const result = scheduleQuestionReview(
      { easeFactor: 2.7, intervalDays: 14, repetitions: 3 },
      "easy",
      NOW,
    );

    expect(result.status).toBe("mastered");
    expect(result.intervalDays).toBeGreaterThanOrEqual(30);
  });
});
