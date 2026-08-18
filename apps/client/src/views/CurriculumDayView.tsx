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
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { ResourceLinks } from "../components/ResourceLinks";
import { TaskWorkspace } from "../components/TaskWorkspace";
import { getDateForOffset } from "../lib/date";
import type { BootstrapData, TaskUpdateHandler } from "../types";

interface CurriculumDayViewProps {
  data: BootstrapData;
  dayId: string;
  generatingLessonId: string | null;
  generationCharacters: number;
  onBack: () => void;
  onOpenDay: (dayId: string) => void;
  onGenerateLesson: (blockId: string) => void;
  onOpenLesson: (blockId: string) => void;
  onOpenChat: (blockId: string) => void;
  onUpdateTask: TaskUpdateHandler;
}

const kindLabels = {
  theory: "Теория",
  practice: "Практика",
  ai: "AI-практика",
  review: "Повторение",
};

export function CurriculumDayView({
  data,
  dayId,
  generatingLessonId,
  generationCharacters,
  onBack,
  onOpenDay,
  onGenerateLesson,
  onOpenLesson,
  onOpenChat,
  onUpdateTask,
}: CurriculumDayViewProps) {
  const days = data.curriculum.flatMap((week) => week.days);
  const dayIndex = days.findIndex((candidate) => candidate.id === dayId);
  const day = days[dayIndex];
  const week = data.curriculum.find((candidate) =>
    candidate.days.some((studyDay) => studyDay.id === dayId),
  );
  const initialOpenBlockId =
    day?.blocks.find((block) => !data.progress.tasks[block.id]?.completed)?.id ??
    day?.blocks[0]?.id ??
    null;
  const [openBlockId, setOpenBlockId] = useState<string | null>(initialOpenBlockId);

  if (!day || !week) {
    return (
      <div className="page-stack narrow-page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Учебный план</p>
            <h1>День не найден</h1>
            <p>Возможно, программа обновилась. Вернись к списку дней.</p>
          </div>
        </header>
        <Button className="primary-button" leftSection={<ArrowLeft size={17} />} onClick={onBack}>
          Вернуться к плану
        </Button>
      </div>
    );
  }

  const completedCount = day.blocks.filter(
    (block) => data.progress.tasks[block.id]?.completed,
  ).length;
  const progress = Math.round((completedCount / day.blocks.length) * 100);
  const previousDay = days[dayIndex - 1];
  const nextDay = days[dayIndex + 1];

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
            Весь план
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
            <span>День {day.offset + 1} из {days.length}</span>
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
            <p className="eyebrow">
              Неделя {week.number} · {getDateForOffset(data.settings.startDate, day.offset)}
            </p>
            <h1>{day.title}</h1>
            <p>{week.outcome}</p>
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
          const lesson = data.ai.lessons.curriculum[block.id];
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

                {block.kind === "practice" || block.kind === "ai" ? (
                  <TaskWorkspace
                    includeCustomTask={block.kind === "ai"}
                    onUpdateTask={onUpdateTask}
                    progress={task}
                    runner={block.exercise?.runner}
                    taskId={block.id}
                    taskTitle={block.title}
                    track="curriculum"
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
                  onClick={() =>
                    void onUpdateTask(block.id, { completed: !task.completed })
                  }
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
