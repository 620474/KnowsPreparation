import { Progress, UnstyledButton } from "@mantine/core";
import { Check, Clock3, ListChecks, Target } from "lucide-react";

import { ResourceLinks } from "../components/ResourceLinks";
import type { BootstrapData, StudyBlockKind, TaskProgress } from "../types";

interface YandexSprintViewProps {
  data: BootstrapData;
  onUpdateTask: (taskId: string, progress: TaskProgress) => void;
}

const WEEK_TITLES = [
  "JS core и Big-O",
  "Асинхронность и структуры",
  "Интервью-режим",
];

const BLOCK_LABELS: Record<StudyBlockKind, string> = {
  theory: "Платформа",
  practice: "Задача",
  ai: "AI-секция",
  review: "Разбор",
};

export function YandexSprintView({ data, onUpdateTask }: YandexSprintViewProps) {
  const sprintDays = data.yandexSprint ?? [];
  const allBlocks = sprintDays.flatMap((day) => day.blocks);
  const completedBlocks = allBlocks.filter(
    (block) => data.progress.tasks[block.id]?.completed,
  ).length;
  const totalProgress = allBlocks.length
    ? Math.round((completedBlocks / allBlocks.length) * 100)
    : 0;
  const nextDay = sprintDays.find((day) =>
    day.blocks.some((block) => !data.progress.tasks[block.id]?.completed),
  );
  const nextBlock = nextDay?.blocks.find(
    (block) => !data.progress.tasks[block.id]?.completed,
  );
  const weeks = Array.from({ length: 3 }, (_, weekIndex) =>
    sprintDays.slice(weekIndex * 7, weekIndex * 7 + 7),
  );

  return (
    <div className="page-stack yandex-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Яндекс · 21 день · без календаря</p>
          <h1>Спринт к собеседованию</h1>
          <p>Проходи пункты в любом темпе. Ничего не переносится и не пропадает из-за даты.</p>
        </div>
        <div className="header-stat accent">
          <Target size={20} />
          <strong>{completedBlocks}/{allBlocks.length}</strong>
          <span>блоков готово</span>
        </div>
      </header>

      <section className="yandex-overview">
        <div className="yandex-progress-card">
          <div className="section-heading">
            <div>
              <span>Общий прогресс</span>
              <strong>{totalProgress}%</strong>
            </div>
            <ListChecks size={22} />
          </div>
          <Progress value={totalProgress} color="mint" radius="xl" size="md" />
        </div>
        <div className="yandex-next-card">
          <Clock3 size={22} />
          <div>
            <span>{nextDay ? `Следующий пункт · день ${nextDay.dayNumber}` : "Спринт завершён"}</span>
            <strong>{nextBlock?.title ?? "Можно идти на собеседование"}</strong>
          </div>
        </div>
      </section>

      <div className="yandex-week-list">
        {weeks.map((days, weekIndex) => {
          const weekBlocks = days.flatMap((day) => day.blocks);
          const weekCompleted = weekBlocks.filter(
            (block) => data.progress.tasks[block.id]?.completed,
          ).length;

          return (
            <section className="yandex-week-card" key={weekIndex}>
              <header className="yandex-week-heading">
                <div>
                  <span>Неделя {weekIndex + 1}</span>
                  <h2>{WEEK_TITLES[weekIndex]}</h2>
                </div>
                <strong>{weekCompleted}/{weekBlocks.length}</strong>
              </header>

              <div className="yandex-day-list">
                {days.map((day) => {
                  const dayCompleted = day.blocks.filter(
                    (block) => data.progress.tasks[block.id]?.completed,
                  ).length;

                  return (
                    <article
                      className={dayCompleted === day.blocks.length ? "yandex-day complete" : "yandex-day"}
                      key={day.id}
                    >
                      <div className="yandex-day-marker">
                        <span>День</span>
                        <strong>{String(day.dayNumber).padStart(2, "0")}</strong>
                        <small>{dayCompleted}/{day.blocks.length}</small>
                      </div>
                      <div className="yandex-day-content">
                        <h3>{day.title}</h3>
                        <div className="yandex-task-list">
                          {day.blocks.map((block) => {
                            const task = data.progress.tasks[block.id] ?? {
                              completed: false,
                              note: "",
                            };

                            return (
                              <div
                                className={
                                  task.completed
                                    ? `yandex-task kind-${block.kind} complete`
                                    : `yandex-task kind-${block.kind}`
                                }
                                key={block.id}
                              >
                                <UnstyledButton
                                  className="yandex-task-toggle"
                                  type="button"
                                  onClick={() =>
                                    onUpdateTask(block.id, {
                                      ...task,
                                      completed: !task.completed,
                                    })
                                  }
                                  aria-pressed={task.completed}
                                >
                                  <span className="yandex-check"><Check size={16} /></span>
                                  <span className="yandex-task-copy">
                                    <small>{BLOCK_LABELS[block.kind]} · {block.minutes} минут</small>
                                    <strong>{block.title}</strong>
                                    <p>{block.description}</p>
                                  </span>
                                </UnstyledButton>
                                <ResourceLinks
                                  compact
                                  resourceIds={block.resourceIds}
                                  resources={data.resources}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
