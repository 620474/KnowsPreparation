import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiContentService } from "./ai-content.service";
import type { GeneratedLesson } from "./ai-course";

const lesson: GeneratedLesson = {
  goals: ["Понять сложение"],
  explanation: "Объяснение",
  codeExamples: [],
  diagrams: [],
  commonMistakes: [],
  interviewQuestions: [],
  practice: {
    title: "Сумма",
    statement: "Верни сумму двух чисел",
    constraints: [],
    examples: [],
    runner: {
      starterCode: "function sum(left, right) {}",
      testCases: [
        { title: "Положительные", expression: "sum(2, 3)", expected: 5 },
        { title: "Нули", expression: "sum(0, 0)", expected: 0 },
        { title: "Отрицательные", expression: "sum(-2, -3)", expected: -5 },
      ],
    },
    referenceSolution: "function sum(left, right) { return left + right; }",
  },
  quiz: Array.from({ length: 10 }, (_, index) => ({
    id: `quiz-${String(index + 1).padStart(2, "0")}`,
    prompt: `Вопрос ${index + 1}`,
    options: ["A", "B", "C", `D${index}`],
    correctOptionIndex: index % 4,
    explanation: "Объяснение",
    topic: "JavaScript",
  })),
  summary: "Итог",
};

describe("AiContentService lesson review", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the independent review through the configured Terra model", async () => {
    const service = new AiContentService(new ConfigService({
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "gpt-5.6-sol",
      OPENAI_REVIEW_MODEL: "gpt-5.6-terra-test",
    }));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: JSON.stringify({
              verdict: "approved",
              score: 97,
              issues: [],
              correctedLesson: null,
            }),
          }],
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    await expect(service.reviewGeneratedLesson({
      track: "yandex",
      title: "Сложение",
      objective: "Повторить основы",
    }, lesson)).resolves.toMatchObject({ verdict: "approved", score: 97 });

    const requestBody = fetchSpy.mock.calls[0]?.[1]?.body;
    expect(typeof requestBody).toBe("string");
    const payload = JSON.parse(requestBody as string) as {
      model: string;
      text: { format: { name: string } };
    };
    expect(payload.model).toBe("gpt-5.6-terra-test");
    expect(payload.text.format.name).toBe("frontend_interview_lesson_review");
  });
});
