import { useState } from "react";
import { Alert, Button } from "@mantine/core";
import { AlertTriangle, Check, Play, X } from "lucide-react";

import { runCode, type CodeRunResult } from "../lib/code-runner";
import {
  usePracticeAttempts,
  type PracticeAttemptTarget,
} from "../hooks/use-practice-attempts";
import type { StudyExerciseRunner } from "../types";

interface CodePlaygroundProps {
  code: string;
  runner: StudyExerciseRunner;
  attemptTarget?: PracticeAttemptTarget;
}

const formatAttemptDate = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function CodePlayground({ code, runner, attemptTarget }: CodePlaygroundProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CodeRunResult | null>(null);
  const [error, setError] = useState("");
  const { history, historyError, mutation, submit } = usePracticeAttempts(attemptTarget);
  const latestAttempt = mutation.data ?? history[0];
  const bestAttempt = history.reduce(
    (best, attempt) =>
      !best || attempt.passedCount > best.passedCount ? attempt : best,
    latestAttempt,
  );

  async function handleRun() {
    setRunning(true);
    setError("");
    setResult(null);
    submit(code);
    try {
      setResult(await runCode(code, runner));
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Не удалось запустить код");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="code-playground">
      <div className="code-playground-heading">
        <div>
          <strong>Проверка решения</strong>
          <small>Код выполняется изолированно в Web Worker и останавливается через 3 секунды.</small>
        </div>
        <Button className="primary-button" type="button" leftSection={<Play size={16} />} loading={running} disabled={!code.trim()} onClick={() => void handleRun()}>
          Запустить тесты
        </Button>
      </div>
      {error ? <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert> : null}
      {result ? (
        <div className="code-test-results">
          {result.tests.map((test) => (
            <div className={test.passed ? "passed" : "failed"} key={test.title}>
              {test.passed ? <Check size={16} /> : <X size={16} />}
              <div><strong>{test.title}</strong><small>Получено: {test.actual}</small>{test.passed ? null : <small>Ожидалось: {test.expected}</small>}</div>
            </div>
          ))}
          {result.logs.length ? <pre className="code-console">{result.logs.join("\n")}</pre> : null}
        </div>
      ) : null}
      {attemptTarget ? (
        <div className="practice-attempt-status">
          <div className="practice-attempt-summary">
            <strong>Серверная проверка</strong>
            {mutation.isPaused ? (
              <span>Нет сети · попытка сохранена в очереди</span>
            ) : mutation.isPending ? (
              <span>Проверяем в QuickJS…</span>
            ) : mutation.isError ? (
              <span className="save-error">{mutation.error.message}</span>
            ) : latestAttempt ? (
              <span className={latestAttempt.passed ? "save-success" : "save-error"}>
                {latestAttempt.passed ? "Все тесты пройдены" : "Нужно доработать"}
                {` · ${latestAttempt.passedCount}/${latestAttempt.totalCount}`}
              </span>
            ) : (
              <span>Запусти тесты, чтобы зафиксировать попытку</span>
            )}
          </div>
          {bestAttempt ? (
            <small>
              Лучший результат: {bestAttempt.passedCount}/{bestAttempt.totalCount}
            </small>
          ) : null}
          {history.length > 0 ? (
            <details className="practice-attempt-history">
              <summary>История попыток · {history.length}</summary>
              <div>
                {history.map((attempt) => (
                  <span key={attempt.id}>
                    <b>{attempt.passedCount}/{attempt.totalCount}</b>
                    {formatAttemptDate(attempt.createdAt)}
                  </span>
                ))}
              </div>
            </details>
          ) : null}
          {historyError ? (
            <small className="save-error">Не удалось загрузить историю попыток</small>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
