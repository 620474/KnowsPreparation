import { useState } from "react";
import { Button, Loader, Progress, Textarea } from "@mantine/core";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { ResourceLinks } from "../components/ResourceLinks";
import { TaskWorkspace } from "../components/TaskWorkspace";
import { getDateForOffset } from "../lib/date";
import type { BootstrapData, StudyDay, TaskUpdateHandler, TrackKey } from "../types";

type DayTrackKey = Extract<TrackKey, "curriculum" | "yandex" | "ozon">;

interface TrackDayViewProps {
  data: BootstrapData;
  dayId: string;
  days: StudyDay[];
  track: DayTrackKey;
  trackLabel: string;
  generatingLessonId: string | null;
  generationCharacters: number;
  onBack: () => void;
  onOpenDay: (dayId: string) => void;
  onGenerateLesson: (blockId: string) => void;
  onOpenLesson: (blockId: string) => void;
  onOpenQuiz: (blockId: string) => void;
  onOpenChat: (blockId: string) => void;
  onReviewSolution: (blockId: string, draft: string) => void;
  onUpdateTask: TaskUpdateHandler;
}

const kindLabels = {
  theory: "Теория",
  practice: "Практика",
  ai: "AI-практика",
  review: "Повторение",
};

export function TrackDayView({
  data,
  dayId,
  days,
  track,
  trackLabel,
  generatingLessonId,
  generationCharacters,
  onBack,
  onOpenDay,
  onGenerateLesson,
  onOpenLesson,
  onOpenQuiz,
  onOpenChat,
  onReviewSolution,
  onUpdateTask,
}: TrackDayViewProps) {
  const dayIndex = days.findIndex((candidate) => candidate.id === dayId);
  const day = days[dayIndex];
  const curriculumWeek = track === "curriculum"
    ? data.curriculum.find((candidate) =>
        candidate.days.some((studyDay) => studyDay.id === dayId),
      )
    : null;
  const initialOpenBlockId =
    day?.blocks.find((block) => !data.progress.tasks[block.id]?.completed)?.id ??
    day?.blocks[0]?.id ??
    null;
  const [openBlockId, setOpenBlockId] = useState<string | null>(initialOpenBlockId);

  if (!day) {
    return (
      <div className="page-stack narrow-page">
        <header className="page-header">
          <div>
            <p className="eyebrow">{trackLabel}</p>
            <h1>День не найден</h1>
            <p>Возможно, программа обновилась. Вернись к списку дней.</p>
          </div>
        </header>
        <Button className="primary-button" leftSection={<ArrowLeft size={17} />} onClick={onBack}>
          Вернуться к программе
        </Button>
      </div>
    );
  }

  const completedCount = day.blocks.filter(
    (block) => data.progress.tasks[block.id]?.completed,
  ).length;
  const progress = day.blocks.length
    ? Math.round((completedCount / day.blocks.length) * 100)
    : 0;
  const previousDay = days[dayIndex - 1];
  const nextDay = days[dayIndex + 1];
  const eyebrow = curriculumWeek
    ? `Неделя ${curriculumWeek.number} · ${getDateForOffset(data.settings.startDate, day.offset)}`
    : `${trackLabel} · день ${day.dayNumber} из ${days.length}`;
  const description = curriculumWeek?.outcome ?? "Пройди блоки по порядку и сохрани решения перед переходом дальше.";

  return (
    <div className="page-stack curriculum-day-page">
      <header className="curriculum-day-header">
        <div className="curriculum-day-toolbar">
          <Button
            className="secondary-button"
            leftSection={<ArrowLeft size={16} />}
            size="xs"
            type="button"
            variant="default"
            onClick={onBack}
          >
            Все дни
          </Button>
          <div className="curriculum-day-switcher">
            <Button
              aria-label="Предыдущий день"
              className="secondary-button"
              disabled={!previousDay}
              size="xs"
              type="button"
              variant="default"
              onClick={() => previousDay && onOpenDay(previousDay.id)}
            >
              <ChevronLeft size={17} />
            </Button>
            <span>День {dayIndex + 1} из {days.length}</span>
            <Button
              aria-label="Следующий день"
              className="secondary-button"
              disabled={!nextDay}
              size="xs"
              type="button"
              variant="default"
              onClick={() => nextDay && onOpenDay(nextDay.id)}
            >
              <ChevronRight size={17} />
            </Button>
          </div>
        </div>

        <div className="curriculum-day-title">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{day.title}</h1>
            <p>{description}</p>
          </div>
          <div className="curriculum-day-progress">
            <strong>{completedCount}/{day.blocks.length}</strong>
            <span>блоков завершено</span>
            <Progress color="mint" radius="xl" size="sm" value={progress} />
          </div>
        </div>
      </header>

      <section className="curriculum-day-blocks" aria-label="Блоки учебного дня">
        {day.blocks.map((block, index) => {
          const task = {
            completed: false,
            note: "",
            customTask: "",
            solution: "",
            ...data.progress.tasks[block.id],
          };
          const lesson = data.ai.lessons[track][block.id];
          const quizProgress = data.ai.quizProgress[track][block.id];
          const latestQuizAttempt =
            lesson && quizProgress?.lessonVersion === lesson.version
              ? quizProgress.attempts.at(-1)
              : undefined;
          const hasQuiz = lesson?.quiz.length === 10;
          const supportsLesson = block.kind !== "review";
          const isGenerating = generatingLessonId === block.id;

          return (
            <details
              className={task.completed ? "curriculum-day-block complete" : "curriculum-day-block"}
              key={block.id}
              open={block.id === openBlockId}
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  setOpenBlockId(block.id);
                } else {
                  setOpenBlockId((current) => current === block.id ? null : current);
                }
              }}
            >
              <summary>
                <span className="curriculum-block-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="curriculum-block-summary">
                  <small>{kindLabels[block.kind]} · {block.minutes} минут</small>
                  <strong>{block.title}</strong>
                </span>
                <span className="curriculum-block-status">
                  {task.completed ? <Check size={17} /> : <Clock3 size={17} />}
                  <ChevronDown className="curriculum-block-chevron" size={19} />
                </span>
              </summary>

              <div className="curriculum-block-content">
                <p>{block.description}</p>
                <ResourceLinks resourceIds={block.resourceIds} resources={data.resources} />

                {supportsLesson && data.ai.enabled ? (
                  <div className="curriculum-block-actions">
                    {lesson ? (
                      <>
                        <Button
                          className="secondary-button"
                          leftSection={<BookOpen size={15} />}
                          size="xs"
                          type="button"
                          variant="default"
                          onClick={() => onOpenLesson(block.id)}
                        >
                          Открыть разбор
                        </Button>
                        <Button
                          className="secondary-button"
                          leftSection={<MessageCircle size={15} />}
                          size="xs"
                          type="button"
                          variant="default"
                          onClick={() => onOpenChat(block.id)}
                        >
                          Спросить
                        </Button>
                        {hasQuiz ? (
                          <Button
                            className="secondary-button"
                            leftSection={<ListChecks size={15} />}
                            size="xs"
                            type="button"
                            variant="default"
                            onClick={() => onOpenQuiz(block.id)}
                          >
                            {latestQuizAttempt
                              ? `Тест: ${latestQuizAttempt.score}/10`
                              : "Пройти тест · 10 вопросов"}
                          </Button>
                        ) : (
                          <Button
                            className="secondary-button"
                            disabled={isGenerating}
                            leftSection={isGenerating ? <Loader size={14} /> : <Sparkles size={15} />}
                            size="xs"
                            type="button"
                            variant="default"
                            onClick={() => onGenerateLesson(block.id)}
                          >
                            Добавить тест
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        className="primary-button"
                        disabled={isGenerating}
                        leftSection={isGenerating ? <Loader size={14} /> : <Sparkles size={15} />}
                        size="xs"
                        type="button"
                        onClick={() => onGenerateLesson(block.id)}
                      >
                        {isGenerating ? `Готовим разбор… ${generationCharacters}` : "Сделать разбор"}
                      </Button>
                    )}
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
                      {block.exercise.constraints.length ? (
                        <div className="yandex-exercise-section">
                          <span>Ограничения</span>
                          <ul>
                            {block.exercise.constraints.map((constraint) => (
                              <li key={constraint}>{constraint}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {block.exercise.examples.length ? (
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
                      ) : null}
                    </div>
                  </details>
                ) : null}

                {block.kind === "practice" || block.kind === "ai" ? (
                  <TaskWorkspace
                    includeCustomTask={block.kind === "ai"}
                    onUpdateTask={onUpdateTask}
                    progress={task}
                    runner={block.exercise?.runner}
                    taskId={block.id}
                    taskTitle={block.title}
                    track={track}
                    onReviewWithAi={
                      block.kind === "ai"
                        ? (draft) => onReviewSolution(block.id, draft)
                        : undefined
                    }
                  />
                ) : null}

                <Textarea
                  className="curriculum-block-note"
                  aria-label={`Заметка: ${block.title}`}
                  defaultValue={task.note}
                  label="Заметка"
                  minRows={2}
                  placeholder="Что стоит повторить или уточнить?"
                  onBlur={(event) => void onUpdateTask(block.id, { note: event.target.value })}
                />

                <Button
                  className={task.completed ? "secondary-button" : "primary-button"}
                  leftSection={<Check size={17} />}
                  type="button"
                  variant={task.completed ? "default" : "filled"}
                  onClick={() => void onUpdateTask(block.id, { completed: !task.completed })}
                >
                  {task.completed ? "Вернуть в работу" : "Завершить блок"}
                </Button>
              </div>
            </details>
          );
        })}
      </section>

      <footer className="curriculum-day-footer">
        <Button
          className="secondary-button"
          disabled={!previousDay}
          leftSection={<ChevronLeft size={17} />}
          type="button"
          variant="default"
          onClick={() => previousDay && onOpenDay(previousDay.id)}
        >
          Предыдущий день
        </Button>
        <Button
          className="primary-button"
          disabled={!nextDay}
          rightSection={<ChevronRight size={17} />}
          type="button"
          onClick={() => nextDay && onOpenDay(nextDay.id)}
        >
          Следующий день
        </Button>
      </footer>
    </div>
  );
}
