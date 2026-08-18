import { getQuickJS, shouldInterruptAfterDeadline } from "quickjs-emscripten";

import type { GeneratedLesson } from "./ai-course";

const RUNNER_TIMEOUT_MS = 750;
const RUNNER_MEMORY_LIMIT_BYTES = 32 * 1024 * 1024;
const MAX_GENERATION_ATTEMPTS = 3;

export interface GeneratedRunnerValidation {
  valid: boolean;
  failures: string[];
}

export class GeneratedRunnerValidationError extends Error {
  constructor() {
    super("Generated runner did not pass its reference solution");
    this.name = "GeneratedRunnerValidationError";
  }
}

export type PersistableGeneratedLesson = Omit<GeneratedLesson, "practice"> & {
  practice: Omit<GeneratedLesson["practice"], "referenceSolution">;
};

interface RunnerResult {
  title: string;
  passed: boolean;
  error?: string;
}

function buildRunnerSource(lesson: GeneratedLesson, solution: string) {
  const testCases = JSON.stringify(lesson.practice.runner.testCases);
  return [
    '"use strict";',
    "const __prepObjectKeys = Object.keys;",
    "const __prepArrayIsArray = Array.isArray;",
    `const __prepTests = ${testCases};`,
    `const __prepEqual = (left, right) => {
      if (Object.is(left, right)) return true;
      if (__prepArrayIsArray(left) || __prepArrayIsArray(right)) {
        return __prepArrayIsArray(left) && __prepArrayIsArray(right) &&
          left.length === right.length &&
          left.every((value, index) => __prepEqual(value, right[index]));
      }
      if (typeof left === "object" && left !== null && typeof right === "object" && right !== null) {
        const leftKeys = __prepObjectKeys(left).sort();
        const rightKeys = __prepObjectKeys(right).sort();
        return __prepEqual(leftKeys, rightKeys) &&
          leftKeys.every((key) => __prepEqual(left[key], right[key]));
      }
      return false;
    };`,
    solution,
    `__prepTests.map((testCase) => {
      try {
        const actual = eval(testCase.expression);
        return {
          title: testCase.title,
          passed: __prepEqual(actual, testCase.expected),
        };
      } catch (error) {
        return {
          title: testCase.title,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });`,
  ].join("\n");
}

export async function validateGeneratedRunner(
  lesson: GeneratedLesson,
  timeoutMs = RUNNER_TIMEOUT_MS,
): Promise<GeneratedRunnerValidation> {
  try {
    const quickJs = await getQuickJS();
    const evaluationOptions = () => ({
      shouldInterrupt: shouldInterruptAfterDeadline(Date.now() + timeoutMs),
      memoryLimitBytes: RUNNER_MEMORY_LIMIT_BYTES,
      maxStackSizeBytes: 512 * 1024,
    });
    quickJs.evalCode(lesson.practice.runner.starterCode, evaluationOptions());
    const starterResult = quickJs.evalCode(
      buildRunnerSource(lesson, lesson.practice.runner.starterCode),
      evaluationOptions(),
    );
    if (
      Array.isArray(starterResult) &&
      starterResult.length === lesson.practice.runner.testCases.length &&
      starterResult.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "passed" in item &&
          item.passed === true,
      )
    ) {
      return { valid: false, failures: ["starterCode already passes every test"] };
    }
    const result = quickJs.evalCode(
      buildRunnerSource(lesson, lesson.practice.referenceSolution),
      evaluationOptions(),
    );
    if (!Array.isArray(result)) {
      return { valid: false, failures: ["runner returned an invalid result"] };
    }
    const tests = result.filter(
      (item): item is RunnerResult =>
        typeof item === "object" &&
        item !== null &&
        typeof item.title === "string" &&
        typeof item.passed === "boolean",
    );
    if (tests.length !== lesson.practice.runner.testCases.length) {
      return { valid: false, failures: ["runner returned an incomplete result"] };
    }
    const failures = tests
      .filter((test) => !test.passed)
      .map((test) => test.error ? `${test.title}: ${test.error}` : test.title);
    return { valid: failures.length === 0, failures };
  } catch (error) {
    return {
      valid: false,
      failures: [error instanceof Error ? error.message : "runner execution failed"],
    };
  }
}

export function omitReferenceSolution(
  lesson: GeneratedLesson,
): PersistableGeneratedLesson {
  return {
    ...lesson,
    practice: {
      title: lesson.practice.title,
      statement: lesson.practice.statement,
      constraints: lesson.practice.constraints,
      examples: lesson.practice.examples,
      runner: lesson.practice.runner,
    },
  };
}

export async function generateValidatedLesson(
  generate: (attempt: number) => Promise<GeneratedLesson>,
  onValidationFailure?: (
    validation: GeneratedRunnerValidation,
    attempt: number,
  ) => void,
): Promise<PersistableGeneratedLesson> {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const lesson = await generate(attempt);
    const validation = await validateGeneratedRunner(lesson);
    if (validation.valid) return omitReferenceSolution(lesson);
    onValidationFailure?.(validation, attempt);
  }
  throw new GeneratedRunnerValidationError();
}
