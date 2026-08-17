import { describe, expect, it } from "vitest";

import {
  buildAiChatContext,
  buildOzonAiChatContext,
  buildYandexAiChatContext,
} from "./ai-chat";
import type { StudyDay } from "./curriculum";
import type { AiCourse, AiCourseItem, AiLesson } from "./schemas/ai-course.schema";

const item: AiCourseItem = {
  id: "lesson-01",
  title: "Event loop",
  objective: "Объяснить порядок выполнения",
  estimatedMinutes: 120,
  resourceIds: [],
};

const course: AiCourse = {
  key: "main",
  title: "Курс",
  summary: "Подготовка",
  goal: "Пройти собеседование",
  level: "middle-plus",
  deadline: "2026-09-01",
  dailyMinutes: 120,
  targetCompanies: ["Яндекс"],
  weakTopics: ["Асинхронность"],
  version: 1,
  generatedAt: "2026-08-16T00:00:00.000Z",
  items: [item],
};

describe("buildAiChatContext", () => {
  it("includes the active topic without a generated lesson", () => {
    const context = buildAiChatContext({ course, item, lesson: null, resources: [] });

    expect(context).toContain("Текущая тема: Event loop");
    expect(context).toContain("Полный текст урока ещё не сгенерирован");
  });

  it("includes generated lesson material", () => {
    const lesson: AiLesson = {
      courseKey: "main",
      courseVersion: 1,
      itemId: "lesson-01",
      title: "Event loop",
      goals: ["Различать очереди"],
      explanation: "Сначала выполняется синхронный код.",
      codeExamples: [],
      diagrams: [
        {
          title: "Цикл событий",
          description: "Порядок обработки очередей",
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
              detail: "Выполняются после очистки стека",
              row: 0,
              column: 1,
            },
          ],
          edges: [{ from: "stack", to: "microtasks", label: "стек пуст" }],
        },
      ],
      commonMistakes: ["Путать очереди"],
      interviewQuestions: ["Что такое microtask?"],
      practice: {
        title: "Порядок логов",
        statement: "Определи порядок",
        constraints: [],
        examples: [],
      },
      summary: "Микрозадачи выполняются до следующей задачи.",
      resourceIds: [],
      version: 1,
      generatedAt: "2026-08-16T00:00:00.000Z",
    };

    const context = buildAiChatContext({ course, item, lesson, resources: [] });

    expect(context).toContain("Сначала выполняется синхронный код");
    expect(context).toContain("Что такое microtask?");
    expect(context).toContain("Цикл событий");
    expect(context).toContain("Стек вызовов");
  });

  it("includes the Yandex block and its exercise", () => {
    const day: StudyDay = {
      id: "yandex-d01",
      dayNumber: 1,
      offset: 0,
      title: "Big-O и базовые структуры",
      blocks: [
        {
          id: "yandex-d01-algorithms",
          kind: "practice",
          title: "Сложность Array, Object, Map и Set",
          description: "Оцени операции и реши задачу на частоты.",
          minutes: 50,
          resourceIds: [],
          exercise: {
            statement: "Найди самый частый элемент.",
            signature: "mostFrequent(values: number[]): number",
            constraints: ["До 100 000 элементов"],
            examples: [],
          },
        },
      ],
    };

    const context = buildYandexAiChatContext({
      day,
      block: day.blocks[0]!,
      lesson: null,
      resources: [],
    });

    expect(context).toContain("frontend-собеседование в Яндекс");
    expect(context).toContain("Сложность Array, Object, Map и Set");
    expect(context).toContain("Найди самый частый элемент");
    expect(context).toContain("Полный текст урока ещё не сгенерирован");
  });

  it("includes the Ozon block and its exercise", () => {
    const day: StudyDay = {
      id: "ozon-d01",
      dayNumber: 1,
      offset: 0,
      title: "Типы и преобразования",
      blocks: [
        {
          id: "ozon-d01-practice",
          kind: "practice",
          title: "Разворот 32-битного числа",
          description: "Обработай знак и переполнение.",
          minutes: 50,
          resourceIds: [],
          exercise: {
            statement: "Разверни цифры числа.",
            signature: "reverseInteger(value: number): number",
            constraints: ["Верни 0 при переполнении"],
            examples: [],
          },
        },
      ],
    };

    const context = buildOzonAiChatContext({
      day,
      block: day.blocks[0]!,
      lesson: null,
      resources: [],
    });

    expect(context).toContain("frontend-собеседование в Ozon");
    expect(context).toContain("Разворот 32-битного числа");
    expect(context).toContain("Разверни цифры числа");
  });
});
