import { useRef, useState, type FormEvent } from "react";
import { Button, Textarea } from "@mantine/core";
import { Save } from "lucide-react";

import type {
  StudyExerciseRunner,
  TaskProgress,
  TaskUpdateHandler,
  TrackKey,
} from "../types";
import { buildSolutionReviewDraft } from "../lib/ai-chat-draft";
import { CodeEditor } from "./CodeEditor";
import { CodePlayground, type CodePlaygroundHandle } from "./CodePlayground";

interface TaskWorkspaceProps {
  taskId: string;
  taskTitle: string;
  progress: TaskProgress;
  includeCustomTask: boolean;
  runner?: StudyExerciseRunner;
  track: TrackKey;
  onUpdateTask: TaskUpdateHandler;
  onReviewWithAi?: (draft: string) => void;
}

export function TaskWorkspace({
  taskId,
  taskTitle,
  progress,
  includeCustomTask,
  runner,
  track,
  onUpdateTask,
  onReviewWithAi,
}: TaskWorkspaceProps) {
  const playgroundRef = useRef<CodePlaygroundHandle>(null);
  const [customTask, setCustomTask] = useState(progress.customTask);
  const [solution, setSolution] = useState(progress.solution || runner?.starterCode || "");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const dirty =
    solution !== progress.solution ||
    (includeCustomTask && customTask !== progress.customTask);
  const canReviewWithAi = Boolean(onReviewWithAi && solution.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveStatus("idle");
    const saved = await onUpdateTask(taskId, {
      solution,
      ...(includeCustomTask ? { customTask } : {}),
    });
    setSaving(false);
    setSaveStatus(saved ? "saved" : "error");
  }

  return (
    <details className="task-workspace">
      <summary>
        <span>{onReviewWithAi ? "Проверить решение через AI" : includeCustomTask ? "AI-задача и решение" : "Моё решение"}</span>
        {progress.solution ? <small>Есть сохранённое решение</small> : null}
      </summary>
      <form className="task-workspace-form" onSubmit={handleSubmit}>
        {includeCustomTask ? (
          <Textarea
            className="task-workspace-field"
            label="Условие от AI"
            aria-label={`Условие от AI: ${taskTitle}`}
            value={customTask}
            placeholder="Вставь сюда условие, ограничения и примеры, которые выдал AI…"
            minRows={5}
            maxLength={20000}
            autosize
            onChange={(event) => {
              setCustomTask(event.currentTarget.value);
              setSaveStatus("idle");
            }}
          />
        ) : null}
        <CodeEditor
          label="Моё решение"
          ariaLabel={`Решение: ${taskTitle}`}
          value={solution}
          placeholder="Вставь или напиши решение на JavaScript…"
          onChange={(nextSolution) => {
            setSolution(nextSolution);
            setSaveStatus("idle");
          }}
          onRun={runner ? () => playgroundRef.current?.run() : undefined}
        />
        {runner ? (
          <CodePlayground
            ref={playgroundRef}
            attemptTarget={{ track, itemId: taskId, source: "task" }}
            code={solution}
            runner={runner}
          />
        ) : null}
        <div className="task-workspace-actions">
          {onReviewWithAi ? (
            <Button
              className="secondary-button"
              type="button"
              variant="default"
              disabled={!canReviewWithAi}
              onClick={() =>
                onReviewWithAi(
                  buildSolutionReviewDraft({
                    title: taskTitle,
                    task: customTask,
                    solution,
                  }),
                )
              }
            >
              Проверить через AI
            </Button>
          ) : null}
          <Button
            className="primary-button"
            type="submit"
            leftSection={<Save size={16} />}
            loading={saving}
            disabled={!dirty || saving}
          >
            Сохранить в MongoDB
          </Button>
          {saveStatus === "saved" ? <span className="save-success">Сохранено</span> : null}
          {saveStatus === "error" ? <span className="save-error">Не удалось сохранить</span> : null}
        </div>
      </form>
    </details>
  );
}
