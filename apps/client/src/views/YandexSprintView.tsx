import { Alert, Button, Progress, UnstyledButton } from "@mantine/core";
import {
  BookOpenText,
  Check,
  CircleAlert,
  Clock3,
  ListChecks,
  MessageCircle,
  Target,
} from "lucide-react";

import { ResourceLinks } from "../components/ResourceLinks";
import { TaskWorkspace } from "../components/TaskWorkspace";
import type {
  AiLessonQuestionContext,
  AiLesson,
  BootstrapData,
  StudyDay,
  StudyBlockKind,
  TaskUpdateHandler,
} from "../types";

interface YandexSprintViewProps {
  data: BootstrapData;
  sprintDays?: StudyDay[];
  lessons?: Record<string, AiLesson>;
  eyebrow?: string;
  title?: string;
  description?: string;
  weekTitles?: string[];
  generatingLessonId: string | null;
  generationCharacters: number;
  onGenerateLesson: (blockId: string) => void;
  onOpenLesson: (blockId: string) => void;
  onOpenChat: (blockId: string, context?: AiLessonQuestionContext) => void;
  onUpdateTask: TaskUpdateHandler;
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

export function YandexSprintView({
  data,
  sprintDays: providedSprintDays,
  lessons: providedLessons,
  eyebrow = "Яндекс · 21 день · без календаря",
  title = "Спринт к собеседованию",
  description = "Проходи пункты в любом темпе. Ничего не переносится и не пропадает из-за даты.",
  weekTitles = WEEK_TITLES,
  generatingLessonId,
  generationCharacters,
  onGenerateLesson,
  onOpenLesson,
  onOpenChat,
  onUpdateTask,
}: YandexSprintViewProps) {
  const sprintDays = providedSprintDays ?? data.yandexSprint ?? [];
  const lessons = providedLessons ?? data.ai.yandexLessons;
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
  const weeks = Array.from({ length: Math.ceil(sprintDays.length / 7) }, (_, weekIndex) =>
    sprintDays.slice(weekIndex * 7, weekIndex * 7 + 7),
  );

  return (
    <div className="page-stack yandex-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="header-stat accent">
          <Target size={20} />
          <strong>{completedBlocks}/{allBlocks.length}</strong>
          <span>блоков готово</span>
        </div>
      </header>

      {!data.ai.enabled ? (
        <Alert color="orange" icon={<CircleAlert size={18} />} variant="light">
          AI-разборы выключены. Добавь <code>OPENAI_API_KEY</code> в Runtime variables API
          на Northflank и перезапусти deployment.
        </Alert>
      ) : null}

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
                  <h2>{weekTitles[weekIndex] ?? `Неделя ${weekIndex + 1}`}</h2>
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
                            const task = {
                              completed: false,
                              note: "",
                              customTask: "",
                              solution: "",
                              ...data.progress.tasks[block.id],
                            };
                            const lesson = lessons[block.id];
                            const isGenerating = generatingLessonId === block.id;
                            const supportsAiLesson = block.kind !== "review";

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
                                  onClick={() => void onUpdateTask(block.id, {
                                    completed: !task.completed,
                                  })}
                                  aria-pressed={task.completed}
                                >
                                  <span className="yandex-check"><Check size={16} /></span>
                                  <span className="yandex-task-copy">
                                    <small>{BLOCK_LABELS[block.kind]} · {block.minutes} минут</small>
                                    <strong>{block.title}</strong>
                                    <p>{block.description}</p>
                                  </span>
                                </UnstyledButton>
                                {supportsAiLesson ? (
                                  <div className="yandex-ai-actions">
                                    <Button
                                      className="primary-button"
                                      type="button"
                                      leftSection={<BookOpenText size={16} />}
                                      loading={!lesson && isGenerating}
                                      disabled={
                                        !lesson &&
                                        (!data.ai.enabled ||
                                          (generatingLessonId !== null && !isGenerating))
                                      }
                                      onClick={() =>
                                        lesson
                                          ? onOpenLesson(block.id)
                                          : onGenerateLesson(block.id)
                                      }
                                    >
                                      {lesson
                                        ? "Открыть разбор"
                                        : isGenerating && generationCharacters > 0
                                          ? `Пишу · ${generationCharacters.toLocaleString("ru-RU")} симв.`
                                          : "Написать разбор"}
                                    </Button>
                                    <Button
                                      className="secondary-button"
                                      type="button"
                                      variant="default"
                                      leftSection={<MessageCircle size={16} />}
                                      disabled={!data.ai.enabled}
                                      onClick={() => onOpenChat(block.id)}
                                    >
                                      Обсудить
                                    </Button>
                                  </div>
                                ) : null}
                                {block.exercise ? (
                                  <details className="yandex-exercise">
                                    <summary>Условие задачи</summary>
                                    <div className="yandex-exercise-content">
                                      <p>{block.exercise.statement}</p>
                                      {block.exercise.signature ? (
                                        <div className="yandex-exercise-section">
                                          <span>Сигнатура</span>
                                          <pre>{block.exercise.signature}</pre>
                                        </div>
                                      ) : null}
                                      <div className="yandex-exercise-section">
                                        <span>Ограничения</span>
                                        <ul>
                                          {block.exercise.constraints.map((constraint) => (
                                            <li key={constraint}>{constraint}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="yandex-exercise-section">
                                        <span>Примеры</span>
                                        <div className="yandex-examples">
                                          {block.exercise.examples.map((example, exampleIndex) => (
                                            <div className="yandex-example" key={`${example.input}-${exampleIndex}`}>
                                              <small>Пример {exampleIndex + 1}</small>
                                              <pre>Вход: {example.input}{"\n"}Выход: {example.output}</pre>
                                              {example.explanation ? <p>{example.explanation}</p> : null}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </details>
                                ) : null}
                                <ResourceLinks
                                  compact
                                  resourceIds={block.resourceIds}
                                  resources={data.resources}
                                />
                                {block.kind === "practice" || block.kind === "ai" ? (
                                  <TaskWorkspace
                                    includeCustomTask={block.kind === "ai"}
                                    onUpdateTask={onUpdateTask}
                                    progress={task}
                                    runner={block.exercise?.runner}
                                    taskId={block.id}
                                    taskTitle={block.title}
                                  />
                                ) : null}
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
