import { describe, expect, it } from "vitest";

import type { GeneratedLesson } from "./ai-course";
import {
  getStaticRunnerValidationCases,
  STATIC_EXERCISE_RUNNER_COUNT,
} from "./exercise-runners";
import { validateGeneratedRunner } from "./generated-runner";

const createLesson = (
  runner: ReturnType<typeof getStaticRunnerValidationCases>[number],
): GeneratedLesson => ({
  goals: ["Решить задачу"],
  explanation: "Статическая задача",
  codeExamples: [],
  commonMistakes: [],
  interviewQuestions: [],
  diagrams: [],
  practice: {
    title: runner.id,
    statement: "Решить задачу",
    constraints: [],
    examples: [],
    runner: runner.runner as GeneratedLesson["practice"]["runner"],
    referenceSolution: runner.referenceSolution,
  },
  quiz: [],
  summary: "Итог",
});

describe("static exercise runners", () => {
  it("keeps all 39 runners in the validation registry", () => {
    const runners = getStaticRunnerValidationCases();
    expect(STATIC_EXERCISE_RUNNER_COUNT).toBe(39);
    expect(runners).toHaveLength(39);
    expect(new Set(runners.map((runner) => runner.id)).size).toBe(39);
    expect(runners.every((runner) => runner.referenceSolution.trim())).toBe(true);
  });

  it("passes every reference solution through the isolated validator", async () => {
    for (const runner of getStaticRunnerValidationCases()) {
      const validation = await validateGeneratedRunner(createLesson(runner), 2_000);
      expect(validation, runner.id).toEqual({ valid: true, failures: [] });
    }
  }, 30_000);
});
