import { describe, expect, it } from "vitest";

import type { GeneratedLesson } from "./ai-course";
import {
  generateValidatedLesson,
  runPracticeSolution,
  validateGeneratedRunner,
} from "./generated-runner";

const createLesson = (
  referenceSolution: string,
  expected: unknown = 5,
): GeneratedLesson => ({
  goals: ["Решать задачу"],
  explanation: "Объяснение",
  codeExamples: [],
  commonMistakes: [],
  interviewQuestions: [],
  diagrams: [],
  practice: {
    title: "Сумма",
    statement: "Сложи числа",
    constraints: [],
    examples: [],
    runner: {
      starterCode: "function sum(left, right) {}",
      testCases: [
        { title: "Положительные", expression: "sum(2, 3)", expected },
        { title: "Нули", expression: "sum(0, 0)", expected: 0 },
        { title: "Отрицательные", expression: "sum(-2, -3)", expected: -5 },
      ],
    },
    referenceSolution,
  },
  quiz: [],
  summary: "Итог",
});

describe("generated runner", () => {
  it("returns a measurable result for a submitted solution", async () => {
    const lesson = createLesson(
      "function sum(left, right) { return left + right; }",
    );

    await expect(
      runPracticeSolution(
        lesson.practice.runner,
        lesson.practice.referenceSolution,
      ),
    ).resolves.toMatchObject({
      passed: true,
      passedCount: 3,
      totalCount: 3,
      error: null,
    });
  });

  it("records failed tests without rejecting the execution", async () => {
    const lesson = createLesson(
      "function sum(left, right) { return left + right; }",
    );
    const result = await runPracticeSolution(
      lesson.practice.runner,
      "function sum() { return 0; }",
    );

    expect(result.passed).toBe(false);
    expect(result.passedCount).toBe(1);
    expect(result.tests).toHaveLength(3);
  });

  it("accepts a reference solution that passes every test", async () => {
    await expect(
      validateGeneratedRunner(
        createLesson("function sum(left, right) { return left + right; }"),
      ),
    ).resolves.toEqual({ valid: true, failures: [] });
  });

  it("rejects a mismatched reference solution", async () => {
    const result = await validateGeneratedRunner(
      createLesson("function sum(left, right) { return left - right; }"),
    );

    expect(result.valid).toBe(false);
    expect(result.failures).toContain("Положительные");
  });

  it("rejects starter code that already contains the complete solution", async () => {
    const lesson = createLesson("function sum(left, right) { return left + right; }");
    lesson.practice.runner.starterCode =
      "function sum(left, right) { return left + right; }";

    await expect(validateGeneratedRunner(lesson)).resolves.toEqual({
      valid: false,
      failures: ["starterCode already passes every test"],
    });
  });

  it("interrupts an endless reference solution", async () => {
    const result = await validateGeneratedRunner(
      createLesson("function sum() { while (true) {} }"),
      25,
    );

    expect(result.valid).toBe(false);
  });

  it("uses server-only hidden tests when grading a solution", async () => {
    const lesson = createLesson("function sum(left, right) { return left + right; }");
    lesson.practice.runner.hiddenTestCases = [
      { title: "Неизвестная пара", expression: "sum(20, 22)", expected: 42 },
    ];

    const result = await runPracticeSolution(
      lesson.practice.runner,
      "function sum(left, right) { return left === 2 && right === 3 ? 5 : 0; }",
    );

    expect(result.passed).toBe(false);
    expect(result.tests.some((test) => test.title === "Скрытая проверка 1")).toBe(true);
  });

  it("regenerates until the runner is valid and removes the reference solution", async () => {
    let attempts = 0;
    const lesson = await generateValidatedLesson(async () => {
      attempts += 1;
      return createLesson(
        attempts === 1
          ? "function sum(left, right) { return left - right; }"
          : "function sum(left, right) { return left + right; }",
      );
    });

    expect(attempts).toBe(2);
    expect(lesson.practice.runner.testCases).toHaveLength(3);
    expect(lesson.practice).not.toHaveProperty("referenceSolution");
  });

  it("stops after three invalid generations", async () => {
    let attempts = 0;
    await expect(
      generateValidatedLesson(async () => {
        attempts += 1;
        return createLesson("function sum() { return 0; }");
      }),
    ).rejects.toThrow("Generated runner did not pass its reference solution");
    expect(attempts).toBe(3);
  });
});
