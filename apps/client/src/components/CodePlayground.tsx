import { useState } from "react";
import { Alert, Button } from "@mantine/core";
import { AlertTriangle, Check, Play, X } from "lucide-react";

import { runCode, type CodeRunResult } from "../lib/code-runner";
import type { StudyExerciseRunner } from "../types";

interface CodePlaygroundProps {
  code: string;
  runner: StudyExerciseRunner;
}

export function CodePlayground({ code, runner }: CodePlaygroundProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CodeRunResult | null>(null);
  const [error, setError] = useState("");

  async function handleRun() {
    setRunning(true);
    setError("");
    setResult(null);
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
    </div>
  );
}
