import { describe, expect, it } from "vitest";

import { buildReviewQueue } from "./review-queue";
import { normalizeQuestionProgress } from "./question-progress";
import type { InterviewQuestion } from "../types";

const questions: InterviewQuestion[] = Array.from({ length: 8 }, (_, index) => ({
  id: `q-${index + 1}`,
  number: index + 1,
  category: "JavaScript",
  prompt: `Вопрос ${index + 1}`,
}));

describe("buildReviewQueue", () => {
  it("places overdue questions before five new questions", () => {
    const queue = buildReviewQueue(
      questions,
      {
        "q-8": normalizeQuestionProgress({
          status: "review",
          nextReviewAt: "2026-08-17T00:00:00.000Z",
        }),
      },
      new Date("2026-08-18T00:00:00.000Z"),
    );

    expect(queue).toHaveLength(6);
    expect(queue[0]?.question.id).toBe("q-8");
    expect(queue.slice(1).every((item) => item.isNew)).toBe(true);
  });
});
