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

interface ValidatableTestCase {
  title: string;
  expression: string;
  expected?: unknown;
  expectedError?: string;
}

interface ValidatableRunner {
  starterCode: string;
  testCases: ValidatableTestCase[];
  referenceSolution: string;
}

function buildRunnerSource(runner: ValidatableRunner, solution: string) {
  const testCases = JSON.stringify(runner.testCases);
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
    `(async () => {
      const results = [];
      for (const testCase of __prepTests) {
      try {
        const actual = await eval(testCase.expression);
        const expectedError = testCase.expectedError;
        results.push({
          title: testCase.title,
          passed: expectedError === undefined && __prepEqual(actual, testCase.expected),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const expectedError = testCase.expectedError;
        results.push({
          title: testCase.title,
          passed: expectedError !== undefined && message.includes(expectedError),
          error: message,
        });
      }
      }
      return results;
    })();`,
  ].join("\n");
}

async function evaluateRunnerSource(source: string, timeoutMs: number) {
  const quickJs = await getQuickJS();
  const runtime = quickJs.newRuntime();
  runtime.setMemoryLimit(RUNNER_MEMORY_LIMIT_BYTES);
  runtime.setMaxStackSize(512 * 1024);
  runtime.setInterruptHandler(
    shouldInterruptAfterDeadline(Date.now() + timeoutMs),
  );
  const context = runtime.newContext();
  try {
    const evaluation = context.evalCode(source);
    const handle = context.unwrapResult(evaluation);
    try {
      while (true) {
        const state = context.getPromiseState(handle);
        if (state.type === "fulfilled") {
          const value = context.dump(state.value) as unknown;
          if (!state.notAPromise) state.value.dispose();
          return value;
        }
        if (state.type === "rejected") {
          const error = context.dump(state.error) as { message?: string } | string;
          state.error.dispose();
          throw new Error(
            typeof error === "string" ? error : error.message ?? "runner promise rejected",
          );
        }
        context.unwrapResult(runtime.executePendingJobs());
      }
    } finally {
      handle.dispose();
    }
  } finally {
    context.dispose();
    runtime.dispose();
  }
}

export async function validateGeneratedRunner(
  lesson: GeneratedLesson,
  timeoutMs = RUNNER_TIMEOUT_MS,
): Promise<GeneratedRunnerValidation> {
  try {
    const runner = {
      ...lesson.practice.runner,
      referenceSolution: lesson.practice.referenceSolution,
    };
    const starterResult = await evaluateRunnerSource(
      buildRunnerSource(runner, runner.starterCode),
      timeoutMs,
    );
    if (
      Array.isArray(starterResult) &&
      starterResult.length === runner.testCases.length &&
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
    const result = await evaluateRunnerSource(
      buildRunnerSource(runner, runner.referenceSolution),
      timeoutMs,
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
    if (tests.length !== runner.testCases.length) {
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
