import { useState, type FormEvent } from "react";
import { ActionIcon, Button, Progress, Select, Textarea, TextInput } from "@mantine/core";
import { Code2, Plus, Trash2 } from "lucide-react";

import { difficultyLabels } from "../api";
import { dateToInputValue } from "../lib/date";
import type { AlgorithmEntry, BootstrapData, Difficulty } from "../types";

interface AlgorithmsViewProps {
  data: BootstrapData;
  onAdd: (entry: Omit<AlgorithmEntry, "id">) => void;
  onDelete: (id: string) => void;
}

const difficultyOptions: Array<{ value: Difficulty; label: string }> = Object.entries(
  difficultyLabels,
).map(([value, label]) => ({ value: value as Difficulty, label }));

export function AlgorithmsView({ data, onAdd, onDelete }: AlgorithmsViewProps) {
  const [title, setTitle] = useState("");
  const [pattern, setPattern] = useState(data.algorithmPatterns[0] ?? "Массивы и строки");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [solvedAt, setSolvedAt] = useState(dateToInputValue());
  const [note, setNote] = useState("");
  const goal = 80;
  const progress = Math.min(Math.round((data.algorithms.length / goal) * 100), 100);

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
          <strong>{data.algorithms.length}</strong>
          <span>из {goal}</span>
        </div>
      </header>

      <Progress className="goal-track" value={progress} color="mint" radius="xl" size="sm" />

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
