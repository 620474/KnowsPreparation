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
      text: {
        format: {
          name: string;
          schema: {
            properties: {
              correctedLesson: {
                anyOf: Array<{
                  properties?: {
                    quiz: {
                      items: {
                        properties: { code: unknown };
                        required: string[];
                      };
                    };
                  };
                }>;
              };
            };
          };
        };
      };
    };
    expect(payload.model).toBe("gpt-5.6-terra-test");
    expect(payload.text.format.name).toBe("frontend_interview_lesson_review");
    const correctedLessonSchema = payload.text.format.schema.properties.correctedLesson.anyOf[0]
      ?.properties;
    expect(correctedLessonSchema?.quiz.items.required).toContain("code");
    expect(correctedLessonSchema?.quiz.items.properties.code).toEqual({
      anyOf: [{ type: "string" }, { type: "null" }],
    });
  });

  it("logs safe OpenAI error details for a non-streaming request", async () => {
    const service = new AiContentService(new ConfigService({
      OPENAI_API_KEY: "test-key",
    }));
    const logger = (service as unknown as {
      logger: { warn: (value: unknown) => void };
    }).logger;
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        error: {
          message: "Invalid schema for response_format",
          type: "invalid_request_error",
          code: "invalid_json_schema",
          param: "text.format.schema",
        },
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", "x-request-id": "req_test" },
      }),
    );

    await expect(service.reviewGeneratedLesson({
      track: "yandex",
      title: "Сложение",
      objective: "Повторить основы",
    }, lesson)).rejects.toThrow("HTTP 400");

    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({
      event: "openai_http_error",
      status: 400,
      streaming: false,
      openAiRequestId: "req_test",
      openAiMessage: "Invalid schema for response_format",
      openAiErrorType: "invalid_request_error",
      openAiErrorCode: "invalid_json_schema",
      openAiErrorParam: "text.format.schema",
    }));
  });

  it("reads and logs an OpenAI error before a streaming response starts", async () => {
    const service = new AiContentService(new ConfigService({
      OPENAI_API_KEY: "test-key",
    }));
    const logger = (service as unknown as {
      logger: { warn: (value: unknown) => void };
    }).logger;
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        error: {
          message: "Incorrect API key provided",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      }), { status: 401, headers: { "Content-Type": "application/json" } }),
    );
    const internals = service as unknown as {
      performStreamingRequest: (
        payload: Record<string, unknown>,
        onDelta: (delta: string) => void,
        operation: string,
      ) => Promise<string>;
    };

    await expect(internals.performStreamingRequest(
      { model: "gpt-5.6-sol" },
      vi.fn(),
      "yandex_frontend_interview_lesson",
    )).rejects.toThrow("HTTP 401");

    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({
      event: "openai_http_error",
      operation: "yandex_frontend_interview_lesson",
      status: 401,
      streaming: true,
      openAiMessage: "Incorrect API key provided",
      openAiErrorCode: "invalid_api_key",
    }));
  });
});
