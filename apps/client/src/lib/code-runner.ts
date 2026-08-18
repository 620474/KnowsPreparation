import type { StudyExerciseRunner } from "../types";

export interface CodeTestResult {
  title: string;
  passed: boolean;
  actual: string;
  expected: string;
}

export interface CodeRunResult {
  tests: CodeTestResult[];
  logs: string[];
}

export function runCode(
  code: string,
  runner: StudyExerciseRunner,
  timeoutMs = 3_000,
): Promise<CodeRunResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/code-runner.worker.ts", import.meta.url), {
      type: "module",
    });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("Код выполнялся дольше 3 секунд и был остановлен"));
    }, timeoutMs);
    const finish = () => {
      window.clearTimeout(timeout);
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<
      | { type: "complete"; result: CodeRunResult }
      | { type: "error"; message: string }
    >) => {
      finish();
      if (event.data.type === "complete") resolve(event.data.result);
      else reject(new Error(event.data.message));
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "Не удалось запустить JavaScript"));
    };
    worker.postMessage({ code, testCases: runner.testCases });
  });
}
