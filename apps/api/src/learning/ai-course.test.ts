import { describe, expect, it } from "vitest";

import {
  extractResponseText,
  normalizeGeneratedCourse,
  normalizeGeneratedLesson,
  selectResourcesForCourseItem,
} from "./ai-course";
import { RESOURCES } from "./resources";

describe("AI course helpers", () => {
  it("extracts structured text from a Responses API payload", () => {
    const payload = {
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '{"title":"Курс"}' }],
        },
      ],
    };

    expect(extractResponseText(payload)).toBe('{"title":"Курс"}');
  });

  it("normalizes a generated course and bounds lesson duration", () => {
    const course = normalizeGeneratedCourse(
      {
        title: "  Курс по JavaScript  ",
        summary: "Подготовка к платформенной секции",
        lessons: [
          {
            title: "Замыкания",
            objective: "Научиться объяснять lexical environment",
            estimatedMinutes: 500,
            resourceTopics: ["JavaScript", "замыкания"],
          },
        ],
      },
      1,
    );

    expect(course.title).toBe("Курс по JavaScript");
    expect(course.lessons[0]?.estimatedMinutes).toBe(240);
  });

  it("rejects a course with a wrong lesson count", () => {
    expect(() =>
      normalizeGeneratedCourse({ title: "Курс", summary: "Описание", lessons: [] }, 2),
    ).toThrow("course.lessons must contain 2 items");
  });

  it("normalizes a complete lesson", () => {
    const lesson = normalizeGeneratedLesson({
      goals: ["Объяснить event loop"],
      explanation: "Подробное объяснение",
      codeExamples: [
        { title: "Очереди", code: "queueMicrotask(() => 1)", explanation: "Микрозадача" },
      ],
      diagrams: [
        {
          title: "Цикл событий",
          description: "Переход между стеком и очередью микрозадач",
          nodes: [
            {
              id: "stack",
              label: "Стек вызовов",
              detail: "Выполняет синхронный код",
              row: 0,
              column: 0,
            },
            {
              id: "microtasks",
              label: "Микрозадачи",
              detail: "Очищаются после стека",
              row: 9,
              column: 1,
            },
          ],
          edges: [{ from: "stack", to: "microtasks", label: "стек пуст" }],
        },
      ],
      commonMistakes: ["Путать task и microtask"],
      interviewQuestions: ["Что выполнится первым?"],
      practice: {
        title: "Порядок вывода",
        statement: "Определи порядок логов",
        constraints: ["Не запускай код"],
        examples: [{ input: "Promise.resolve()", output: "microtask", explanation: "Очередь" }],
      },
      quiz: Array.from({ length: 10 }, (_, index) => ({
        prompt: `Вопрос ${index + 1}`,
        options: ["Вариант A", "Вариант B", "Вариант C", `Вариант D ${index}`],
        correctOptionIndex: index % 4,
        explanation: "Проверяет понимание порядка выполнения.",
        topic: "Event loop",
      })),
      summary: "Сначала синхронный код, затем микрозадачи.",
    });

    expect(lesson.practice.examples).toHaveLength(1);
    expect(lesson.codeExamples[0]?.title).toBe("Очереди");
    expect(lesson.diagrams).toHaveLength(1);
    expect(lesson.diagrams[0]?.nodes[1]?.row).toBe(4);
    expect(lesson.quiz).toHaveLength(10);
    expect(lesson.quiz[0]?.id).toBe("quiz-01");
  });

  it("links generated topics to the existing resource catalog", () => {
    const ids = selectResourcesForCourseItem(
      {
        title: "Замыкания в JavaScript",
        objective: "Разобрать lexical environment и область видимости",
        estimatedMinutes: 120,
        resourceTopics: ["JavaScript", "замыкания", "closure"],
      },
      RESOURCES,
    );

    expect(ids).toContain("js-closure");
    expect(ids.length).toBeLessThanOrEqual(3);
  });
});
