import { useState, type FormEvent } from "react";
import { ActionIcon, Button, Progress, Select, Textarea, TextInput } from "@mantine/core";
import { Check, ChevronDown, Code2, Plus, Trash2 } from "lucide-react";

import { difficultyLabels } from "../api";
import { TaskWorkspace } from "../components/TaskWorkspace";
import { getPracticeTasks } from "../lib/algorithm-practice";
import { dateToInputValue } from "../lib/date";
import type {
  AlgorithmEntry,
  BootstrapData,
  Difficulty,
  TaskUpdateHandler,
} from "../types";

interface AlgorithmsViewProps {
  data: BootstrapData;
  onAdd: (entry: Omit<AlgorithmEntry, "id">) => void;
  onDelete: (id: string) => void;
  onUpdateTask: TaskUpdateHandler;
}

const difficultyOptions: Array<{ value: Difficulty; label: string }> = Object.entries(
  difficultyLabels,
).map(([value, label]) => ({ value: value as Difficulty, label }));

export function AlgorithmsView({
  data,
  onAdd,
  onDelete,
  onUpdateTask,
}: AlgorithmsViewProps) {
  const [title, setTitle] = useState("");
  const [pattern, setPattern] = useState(data.algorithmPatterns[0] ?? "Массивы и строки");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [solvedAt, setSolvedAt] = useState(dateToInputValue());
  const [note, setNote] = useState("");
  const practiceTasks = getPracticeTasks(
    data.yandexSprint,
    data.ozonSprint,
    data.avitoSprint,
    data.tbankSprint,
  );
  const completedPracticeTasks = practiceTasks.filter(
    (task) => data.progress.tasks[task.id]?.completed,
  ).length;
  const goal = 80;
  const solvedCount = completedPracticeTasks + data.algorithms.length;
  const progress = Math.min(Math.round((solvedCount / goal) * 100), 100);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAdd({ title, pattern, difficulty, solvedAt, note });
    setTitle("");
    setNote("");
  }

  return (
    <div className="page-stack">
      <header className="page-header algorithms-header">
        <div>
          <p className="eyebrow">8–10 паттернов · не 300 задач</p>
          <h1>Алгоритмический минимум</h1>
          <p>Цель — 60–80 разобранных задач с повторением паттернов, а не счётчик ради счётчика.</p>
        </div>
        <div className="algorithm-score">
          <Code2 size={24} />
          <strong>{solvedCount}</strong>
          <span>из {goal}</span>
        </div>
      </header>

      <Progress className="goal-track" value={progress} color="mint" radius="xl" size="sm" />

      <section className="algorithm-practice-section">
        <div className="section-heading compact algorithm-practice-heading">
          <div>
            <p className="eyebrow">Готовые условия</p>
            <h2>Задачи для практики</h2>
            <p>Задачи из спринтов Яндекса и Ozon. Решения сохраняются в общей MongoDB.</p>
          </div>
          <strong>{completedPracticeTasks}/{practiceTasks.length}</strong>
        </div>

        <div className="algorithm-practice-list">
          {practiceTasks.map((task) => {
            const progressEntry = {
              completed: false,
              note: "",
              customTask: "",
              solution: "",
              ...data.progress.tasks[task.id],
            };

            return (
              <details
                className={
                  progressEntry.completed
                    ? "algorithm-practice-card complete"
                    : "algorithm-practice-card"
                }
                key={task.id}
              >
                <summary>
                  <span className="algorithm-practice-check" aria-hidden="true">
                    <Check size={17} />
                  </span>
                  <span className="algorithm-practice-copy">
                    <small>{task.source} · день {task.dayNumber} · {task.dayTitle}</small>
                    <strong>{task.block.title}</strong>
                    <p>{task.block.description}</p>
                  </span>
                  <ChevronDown className="algorithm-practice-chevron" size={20} />
                </summary>

                <div className="algorithm-practice-content">
                  <p>{task.block.exercise.statement}</p>
                  {task.block.exercise.signature ? (
                    <div className="algorithm-practice-part">
                      <span>Сигнатура</span>
                      <pre>{task.block.exercise.signature}</pre>
                    </div>
                  ) : null}
                  <div className="algorithm-practice-part">
                    <span>Ограничения</span>
                    <ul>
                      {task.block.exercise.constraints.map((constraint) => (
                        <li key={constraint}>{constraint}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="algorithm-practice-part">
                    <span>Примеры</span>
                    <div className="algorithm-practice-examples">
                      {task.block.exercise.examples.map((example, index) => (
                        <div key={`${example.input}-${index}`}>
                          <small>Пример {index + 1}</small>
                          <pre>Вход: {example.input}{"\n"}Выход: {example.output}</pre>
                          {example.explanation ? <p>{example.explanation}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    className={progressEntry.completed ? "secondary-button" : "primary-button"}
                    type="button"
                    variant={progressEntry.completed ? "default" : "filled"}
                    leftSection={<Check size={17} />}
                    onClick={() => void onUpdateTask(task.id, {
                      completed: !progressEntry.completed,
                    })}
                  >
                    {progressEntry.completed ? "Вернуть в работу" : "Отметить решённой"}
                  </Button>
                  <TaskWorkspace
                    includeCustomTask={false}
                    onUpdateTask={onUpdateTask}
                    progress={progressEntry}
                    runner={task.block.exercise.runner}
                    taskId={task.id}
                    taskTitle={task.block.title}
                    track={task.track}
                  />
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="algorithm-layout">
        <form className="algorithm-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Новое решение</p>
            <h2>Добавить задачу</h2>
          </div>
          <TextInput
            label="Название"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={2}
            size="md"
            required
          />
          <Select
            label="Паттерн"
            value={pattern}
            data={data.algorithmPatterns}
            onChange={(value) => value && setPattern(value)}
            allowDeselect={false}
            searchable
            size="md"
          />
          <div className="form-row">
            <Select<Difficulty>
              label="Сложность"
              value={difficulty}
              data={difficultyOptions}
              onChange={(value) => value && setDifficulty(value)}
              allowDeselect={false}
              size="md"
            />
            <TextInput
              type="date"
              label="Дата"
              value={solvedAt}
              onChange={(event) => setSolvedAt(event.target.value)}
              size="md"
              required
            />
          </div>
          <Textarea
            label="Что было сложным"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            minRows={3}
          />
          <Button className="primary-button" type="submit" leftSection={<Plus size={18} />}>
            Добавить
          </Button>
        </form>

        <section className="algorithm-history">
          <div className="section-heading compact">
            <div><p className="eyebrow">История</p><h2>Решённые задачи</h2></div>
          </div>
          {data.algorithms.length === 0 ? (
            <div className="empty-state"><Code2 size={30} /><p>Первая решённая задача появится здесь.</p></div>
          ) : (
            <div className="algorithm-list">
              {data.algorithms.map((entry) => (
                <article key={entry.id}>
                  <div>
                    <span>{entry.pattern} · {difficultyLabels[entry.difficulty]}</span>
                    <h3>{entry.title}</h3>
                    {entry.note ? <p>{entry.note}</p> : null}
                  </div>
                  <div className="algorithm-actions">
                    <time dateTime={entry.solvedAt}>{new Intl.DateTimeFormat("ru-RU").format(new Date(`${entry.solvedAt}T00:00:00`))}</time>
                    <ActionIcon
                      type="button"
                      variant="subtle"
                      color="red"
                      onClick={() => onDelete(entry.id)}
                      aria-label={`Удалить ${entry.title}`}
                    >
                      <Trash2 size={17} />
                    </ActionIcon>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
