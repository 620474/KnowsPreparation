import { getQuickJS, shouldInterruptAfterDeadline } from "quickjs-emscripten";
import type { StudyExerciseRunner } from "@prep/contracts";

import type { GeneratedLesson } from "./ai-course";

const RUNNER_TIMEOUT_MS = 750;
const RUNNER_MEMORY_LIMIT_BYTES = 32 * 1024 * 1024;
export const MAX_GENERATION_ATTEMPTS = 3;

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

export interface RunnerResult {
  title: string;
  passed: boolean;
  error?: string;
}

export interface PracticeRunnerExecution {
  passed: boolean;
  passedCount: number;
  totalCount: number;
  durationMs: number;
  error: string | null;
  tests: RunnerResult[];
}

type ServerStudyExerciseRunner = StudyExerciseRunner & {
  hiddenTestCases?: StudyExerciseRunner["testCases"];
};

const executableRunner = (runner: ServerStudyExerciseRunner): StudyExerciseRunner => ({
  starterCode: runner.starterCode,
  testCases: [
    ...runner.testCases,
    ...(runner.hiddenTestCases ?? []).map((testCase, index) => ({
      ...testCase,
      title: `Скрытая проверка ${index + 1}`,
    })),
  ],
});

function buildRunnerSource(runner: StudyExerciseRunner, solution: string) {
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

const executionErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "runner execution failed";

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
  const runner = executableRunner(lesson.practice.runner);
  const starterResult = await runPracticeSolution(
    runner,
    runner.starterCode,
    timeoutMs,
  );
  if (starterResult.passed) {
    return { valid: false, failures: ["starterCode already passes every test"] };
  }
  const result = await runPracticeSolution(
    runner,
    lesson.practice.referenceSolution,
    timeoutMs,
  );
  if (result.error) return { valid: false, failures: [result.error] };
  const failures = result.tests
    .filter((test) => !test.passed)
    .map((test) => test.error ? `${test.title}: ${test.error}` : test.title);
  return { valid: failures.length === 0, failures };
}

export async function runPracticeSolution(
  sourceRunner: ServerStudyExerciseRunner,
  solution: string,
  timeoutMs = RUNNER_TIMEOUT_MS,
): Promise<PracticeRunnerExecution> {
  const runner = executableRunner(sourceRunner);
  const startedAt = Date.now();
  try {
    const result = await evaluateRunnerSource(
      buildRunnerSource(runner, solution),
      timeoutMs,
    );
    if (!Array.isArray(result)) {
      throw new Error("runner returned an invalid result");
    }
    const tests = result.filter(
      (item): item is RunnerResult =>
        typeof item === "object" &&
        item !== null &&
        typeof item.title === "string" &&
        typeof item.passed === "boolean",
    );
    if (tests.length !== runner.testCases.length) {
      throw new Error("runner returned an incomplete result");
    }
    const passedCount = tests.filter((test) => test.passed).length;
    return {
      passed: passedCount === tests.length,
      passedCount,
      totalCount: tests.length,
      durationMs: Date.now() - startedAt,
      error: null,
      tests,
    };
  } catch (error) {
    return {
      passed: false,
      passedCount: 0,
      totalCount: runner.testCases.length,
      durationMs: Date.now() - startedAt,
      error: executionErrorMessage(error),
      tests: [],
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
