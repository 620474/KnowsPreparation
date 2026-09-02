import { describe, expect, it } from "vitest";

import { QUESTION_BANK } from "./curriculum";
import { runPracticeSolution } from "./generated-runner";
import { QUESTION_TRAINING } from "./question-training";

describe("evidence question training", () => {
  it("provides thirty concrete interview exercises without exposing evaluators", () => {
    expect(Object.keys(QUESTION_TRAINING)).toHaveLength(30);
    expect(QUESTION_BANK.filter((question) => question.exercise)).toHaveLength(30);
    expect(QUESTION_BANK.slice(0, 30).every((question) => question.exercise)).toBe(true);
    expect(QUESTION_BANK.some((question) => "evaluator" in question)).toBe(false);
  });

  it("keeps every multiple-choice evaluator inside its public choice range", () => {
    for (const definition of Object.values(QUESTION_TRAINING)) {
      if (definition.evaluator.mode !== "choice") continue;
      expect(definition.evaluator.correctIndex).toBeGreaterThanOrEqual(0);
      expect(definition.evaluator.correctIndex).toBeLessThan(
        definition.exercise.choices?.length ?? 0,
      );
    }
  });

  it("fails starter code and passes the reference for every code runner", async () => {
    for (const definition of Object.values(QUESTION_TRAINING)) {
      if (definition.evaluator.mode !== "runner") continue;
      const starter = await runPracticeSolution(
        definition.evaluator.runner,
        definition.evaluator.runner.starterCode,
      );
      const reference = await runPracticeSolution(
        definition.evaluator.runner,
        definition.evaluator.referenceSolution,
      );
      expect(starter.passed, definition.exercise.instructions).toBe(false);
      expect(reference.passed, definition.exercise.instructions).toBe(true);
    }
  });
});
