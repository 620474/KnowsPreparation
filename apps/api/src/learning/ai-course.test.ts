import { describe, expect, it } from "vitest";

import {
  extractResponseText,
  normalizeGeneratedCourse,
  normalizeGeneratedLesson,
  normalizeGeneratedLessonReview,
  selectResourcesForCourseItem,
} from "./ai-course";
import { RESOURCES } from "./resources";

const quizCapabilities = [
  "recall", "recall",
  "comprehension", "comprehension", "comprehension", "comprehension",
  "prediction", "prediction", "prediction", "prediction",
  "debugging", "debugging", "debugging",
  "application", "application", "application",
  "transfer", "transfer",
  "tradeoff", "tradeoff",
] as const;

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
        runner: {
          starterCode: "function executionOrder() {}",
          testCases: [
            { title: "Синхронный код", expression: "executionOrder('sync')", expected: '"sync"' },
            { title: "Микрозадача", expression: "executionOrder('microtask')", expected: '"microtask"' },
            { title: "Задача", expression: "executionOrder('task')", expected: '"task"' },
          ],
          hiddenTestCases: [
            { title: "Дополнительный 1", expression: "executionOrder('a')", expected: '"a"' },
            { title: "Дополнительный 2", expression: "executionOrder('b')", expected: '"b"' },
            { title: "Дополнительный 3", expression: "executionOrder('c')", expected: '"c"' },
          ],
        },
        referenceSolution: "function executionOrder(value) { return value; }",
      },
      quiz: Array.from({ length: 20 }, (_, index) => ({
        prompt: `Вопрос ${index + 1}`,
        options: ["Вариант A", "Вариант B", "Вариант C", `Вариант D ${index}`],
        correctOptionIndex: index % 4,
        explanation: "Проверяет понимание порядка выполнения.",
        topic: "Event loop",
        tier: index < 10 ? "core" : "deep",
        capability: quizCapabilities[index],
        ...(index < 8 ? { code: `const value = ${index};` } : {}),
      })),
      summary: "Сначала синхронный код, затем микрозадачи.",
    });

    expect(lesson.practice.examples).toHaveLength(1);
    expect(lesson.practice.runner.testCases[0]?.expected).toBe("sync");
    expect(lesson.practice.referenceSolution).toContain("return value");
    expect(lesson.codeExamples[0]?.title).toBe("Очереди");
    expect(lesson.diagrams).toHaveLength(1);
    expect(lesson.diagrams[0]?.nodes[1]?.row).toBe(4);
    expect(lesson.quiz).toHaveLength(20);
    expect(lesson.quiz[0]?.id).toBe("quiz-01");
  });

  it("rejects a lesson runner with fewer than three tests", () => {
    expect(() => normalizeGeneratedLesson({
      goals: [],
      explanation: "Объяснение",
      codeExamples: [],
      diagrams: [],
      commonMistakes: [],
      interviewQuestions: [],
      practice: {
        title: "Задача",
        statement: "Условие",
        constraints: [],
        examples: [],
        runner: {
          starterCode: "function solve() {}",
          testCases: [
            { title: "Один тест", expression: "solve()", expected: "null" },
          ],
          hiddenTestCases: [],
        },
        referenceSolution: "function solve() { return null; }",
      },
      quiz: Array.from({ length: 10 }, (_, index) => ({
        prompt: `Вопрос ${index}`,
        options: ["A", "B", "C", `D${index}`],
        correctOptionIndex: 0,
        explanation: "Объяснение",
        topic: "Тема",
      })),
      summary: "Итог",
    })).toThrow("testCases must contain between 3 and 6 items");
  });

  it("normalizes an approved independent lesson review", () => {
    expect(normalizeGeneratedLessonReview({
      verdict: "approved",
      score: 96,
      issues: [],
      correctedLesson: null,
    })).toEqual({
      verdict: "approved",
      score: 96,
      issues: [],
      correctedLesson: null,
    });
  });

  it("requires a corrected lesson for a revised review", () => {
    expect(() => normalizeGeneratedLessonReview({
      verdict: "revised",
      score: 78,
      issues: [{
        severity: "critical",
        category: "quiz",
        message: "Неверно отмечен правильный ответ",
      }],
      correctedLesson: null,
    })).toThrow("correctedLesson is required");
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
