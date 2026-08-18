/// <reference lib="webworker" />

import { areRunnerValuesEqual, formatRunnerValue } from "../lib/code-runner-core";
import type { StudyExerciseTestCase } from "../types";

interface RunMessage {
  code: string;
  testCases: StudyExerciseTestCase[];
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...values: unknown[]) => Promise<unknown>;

workerScope.onmessage = async (event: MessageEvent<RunMessage>) => {
  const logs: string[] = [];
  const runnerConsole = Object.fromEntries(
    ["log", "info", "warn", "error"].map((method) => [
      method,
      (...values: unknown[]) => logs.push(`[${method}] ${values.map(formatRunnerValue).join(" ")}`),
    ]),
  );
  const source = `
    "use strict";
    const console = runnerConsole;
    ${event.data.code}
    const results = [];
    for (const testCase of testCases) {
      try {
        const actual = await eval(testCase.expression);
        const expectedError = testCase.expectedError;
        results.push({
          title: testCase.title,
          passed: expectedError === undefined && areEqual(actual, testCase.expected),
          actual: formatValue(actual),
          expected: expectedError === undefined
            ? formatValue(testCase.expected)
            : "Ошибка: " + (expectedError || "любая"),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const expectedError = testCase.expectedError;
        results.push({
          title: testCase.title,
          passed: expectedError !== undefined && message.includes(expectedError),
          actual: "Ошибка: " + message,
          expected: expectedError === undefined
            ? formatValue(testCase.expected)
            : "Ошибка: " + (expectedError || "любая"),
        });
      }
    }
    return results;
  `;

  try {
    const execute = new AsyncFunction(
      "testCases",
      "runnerConsole",
      "areEqual",
      "formatValue",
      source,
    );
    const tests = await execute(
      event.data.testCases,
      runnerConsole,
      areRunnerValuesEqual,
      formatRunnerValue,
    );
    workerScope.postMessage({ type: "complete", result: { tests, logs } });
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
      logs,
    });
  }
};

export {};
