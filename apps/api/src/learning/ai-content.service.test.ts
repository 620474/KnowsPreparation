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

const openAiJsonResponse = (value: unknown) => new Response(JSON.stringify({
  output: [{
    type: "message",
    content: [{
      type: "output_text",
      text: JSON.stringify(value),
    }],
  }],
}), { status: 200, headers: { "Content-Type": "application/json" } });

const getRequestPayload = (fetchSpy: ReturnType<typeof vi.spyOn>) => {
  const requestBody = fetchSpy.mock.calls[0]?.[1]?.body;
  expect(typeof requestBody).toBe("string");
  return JSON.parse(requestBody as string) as {
    instructions: string;
    model: string;
    text: {
      format: {
        type: string;
        strict: boolean;
        name: string;
        schema: Record<string, unknown>;
      };
    };
  };
};

const muteServiceWarnings = (service: AiContentService) => {
  const logger = (service as unknown as {
    logger: { warn: (value: unknown) => void };
  }).logger;
  vi.spyOn(logger, "warn").mockImplementation(() => undefined);
};

describe("AiContentService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("adds the shared terminology policy to generated lessons", async () => {
    const service = new AiContentService(new ConfigService({
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "gpt-5.6-sol",
    }));
    muteServiceWarnings(service);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(openAiJsonResponse({}));

    await expect(service.generateLesson({
      goal: "Подготовиться к frontend-собеседованию",
      level: "middle",
      deadline: "2026-12-01",
      dailyMinutes: 120,
      targetCompanies: ["Яндекс"],
      weakTopics: ["Event loop"],
    }, {
      id: "event-loop",
      title: "Event loop",
      objective: "Понять очереди выполнения",
      estimatedMinutes: 90,
      resourceIds: [],
    }, [])).rejects.toThrow("OpenAI вернул неполный урок");

    const payload = getRequestPayload(fetchSpy);
    expect(payload.instructions).toContain(
      "читатель не должен быть обязан заранее знать специальные термины",
    );
    expect(payload.instructions).toContain("Формальный перевод не является объяснением");
    expect(payload.instructions).toContain("Статья может стать немного длиннее ради понятности");
    expect(payload.instructions).toContain("Не создавай отдельный словарь терминов");
    expect(payload.text.format.type).toBe("json_schema");
    expect(payload.text.format.strict).toBe(true);
  });

  it("uses the same clarity policy for static track lessons", async () => {
    const service = new AiContentService(new ConfigService({
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "gpt-5.6-sol",
    }));
    muteServiceWarnings(service);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(openAiJsonResponse({}));
    const prompt = {
      name: "test_track_lesson",
      role: "Роль тестового наставника",
      program: "Программа тестового трека",
      note: "Особое требование тестового трека",
      targetCompany: "Тестовая компания",
    };
    const block = {
      id: "event-loop-theory",
      kind: "theory" as const,
      title: "Event loop",
      description: "Разобрать задачи и микрозадачи",
      minutes: 40,
      resourceIds: [],
    };

    await expect(service.generateTrackLesson(prompt, {
      id: "day-1",
      dayNumber: 1,
      offset: 0,
      title: "Асинхронность",
      blocks: [block],
    }, block, [])).rejects.toThrow("OpenAI вернул неполный разбор темы");

    const payload = getRequestPayload(fetchSpy);
    expect(payload.instructions).toContain(
      "читатель не должен быть обязан заранее знать специальные термины",
    );
    expect(payload.instructions).toContain(prompt.role);
    expect(payload.instructions).toContain(prompt.program);
    expect(payload.instructions).toContain(prompt.note);
  });

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

    const payload = getRequestPayload(fetchSpy);
    expect(payload.model).toBe("gpt-5.6-terra-test");
    expect(payload.text.format.name).toBe("frontend_interview_lesson_review");
    expect(payload.instructions).toContain("# Rubric 0–100");
    expect(payload.instructions).toContain("score >= 88");
    expect(payload.instructions).toContain("terminology_onboarding");
    expect(payload.instructions).toContain(
      "Более длинное объяснение не считается более понятным",
    );
    expect(payload.instructions).toContain("Task — это задача");
    expect(payload.instructions).toContain("не являются достаточными");
    const reviewSchema = payload.text.format.schema as {
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
    const correctedLessonSchema = reviewSchema.properties.correctedLesson.anyOf[0]?.properties;
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
