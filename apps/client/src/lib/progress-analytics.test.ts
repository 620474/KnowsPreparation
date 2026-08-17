import { describe, expect, it } from "vitest";

import { calculateProgressAnalytics } from "./progress-analytics";
import { normalizeQuestionProgress } from "./question-progress";
import type { BootstrapData } from "../types";

const data: BootstrapData = {
  settings: { startDate: "2026-08-01", dailyMinutes: 120, coreWeeks: 12, bufferWeeks: 0 },
  curriculum: [],
  yandexSprint: [],
  ozonSprint: [],
  resources: [],
  questions: [
    { id: "q-js", number: 1, category: "JavaScript", prompt: "JS" },
    { id: "q-react", number: 2, category: "React", prompt: "React" },
  ],
  algorithmPatterns: [],
  progress: {
    tasks: {},
    questions: {
      "q-js": normalizeQuestionProgress({
        status: "review",
        nextReviewAt: "2026-08-17T00:00:00.000Z",
        reviewCount: 3,
        lapseCount: 1,
      }),
      "q-react": normalizeQuestionProgress({
        status: "mastered",
        nextReviewAt: "2026-09-18T00:00:00.000Z",
        reviewCount: 2,
      }),
    },
  },
  algorithms: [],
  mockInterviews: [
    {
      id: "mock-1",
      status: "completed",
      durationMinutes: 20,
      startedAt: "2026-08-18T00:00:00.000Z",
      completedAt: "2026-08-18T00:20:00.000Z",
      questions: [],
      answers: {},
      evaluation: {
        overallScore: 76,
        summary: "Неплохо",
        strengths: [],
        weakTopics: ["Замыкания"],
        questions: [],
      },
    },
  ],
  ai: {
    enabled: true,
    model: "test-model",
    course: null,
    lessons: {},
    yandexLessons: {},
    ozonLessons: {},
    quizProgress: {
      course: {
        lesson: {
          itemId: "lesson",
          lessonVersion: 1,
          attempts: [
            {
              score: 9,
              completedAt: "2026-08-18T00:00:00.000Z",
              answers: [
                {
                  questionId: "quiz-1",
                  selectedOptionIndex: 0,
                  correct: false,
                  topic: "Event loop",
                },
              ],
            },
          ],
        },
      },
      yandex: {},
      ozon: {},
    },
  },
};

describe("calculateProgressAnalytics", () => {
  it("combines review, quiz and mock interview signals", () => {
    const analytics = calculateProgressAnalytics(data, new Date("2026-08-18T00:00:00.000Z"));

    expect(analytics.mastered).toBe(1);
    expect(analytics.due).toBe(1);
    expect(analytics.reviewCount).toBe(5);
    expect(analytics.averageMockScore).toBe(76);
    expect(analytics.weakTopics).toEqual([
      { topic: "Замыкания", score: 4 },
      { topic: "Event loop", score: 3 },
    ]);
  });
});
