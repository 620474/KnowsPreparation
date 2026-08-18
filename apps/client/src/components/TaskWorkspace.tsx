import { useState, type FormEvent } from "react";
import { Button, Textarea } from "@mantine/core";
import { Save } from "lucide-react";

import type {
  StudyExerciseRunner,
  TaskProgress,
  TaskUpdateHandler,
  TrackKey,
} from "../types";
import { CodePlayground } from "./CodePlayground";

interface TaskWorkspaceProps {
  taskId: string;
  taskTitle: string;
  progress: TaskProgress;
  includeCustomTask: boolean;
  runner?: StudyExerciseRunner;
  track: TrackKey;
  onUpdateTask: TaskUpdateHandler;
}

export function TaskWorkspace({
  taskId,
  taskTitle,
  progress,
  includeCustomTask,
  runner,
  track,
  onUpdateTask,
}: TaskWorkspaceProps) {
  const [customTask, setCustomTask] = useState(progress.customTask);
  const [solution, setSolution] = useState(progress.solution || runner?.starterCode || "");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const dirty =
    solution !== progress.solution ||
    (includeCustomTask && customTask !== progress.customTask);

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
        <span>{includeCustomTask ? "AI-задача и решение" : "Моё решение"}</span>
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
        <Textarea
          className="task-workspace-field solution-editor"
          label="Моё решение"
          aria-label={`Решение: ${taskTitle}`}
          value={solution}
          placeholder="Вставь или напиши решение на JavaScript…"
          minRows={10}
          maxLength={50000}
          autosize
          onChange={(event) => {
            setSolution(event.currentTarget.value);
            setSaveStatus("idle");
          }}
        />
        {runner ? (
          <CodePlayground
            attemptTarget={{ track, itemId: taskId, source: "task" }}
            code={solution}
            runner={runner}
          />
        ) : null}
        <div className="task-workspace-actions">
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
