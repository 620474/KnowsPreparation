import { Button, Loader, UnstyledButton } from "@mantine/core";
import { BookOpen, Check, ChevronDown, Clock3, MessageCircle, Sparkles } from "lucide-react";

import { ResourceLinks } from "../components/ResourceLinks";
import { getStudyPosition } from "../lib/date";
import type { BootstrapData, TaskUpdateHandler } from "../types";

interface PlanViewProps {
  data: BootstrapData;
  generatingLessonId: string | null;
  generationCharacters: number;
  onGenerateLesson: (blockId: string) => void;
  onOpenLesson: (blockId: string) => void;
  onOpenChat: (blockId: string, context?: { section: string; excerpt: string }) => void;
  onUpdateTask: TaskUpdateHandler;
}

export function PlanView({
  data,
  generatingLessonId,
  generationCharacters,
  onGenerateLesson,
  onOpenLesson,
  onOpenChat,
  onUpdateTask,
}: PlanViewProps) {
  const lessons = data.ai.lessons.curriculum;
  const currentWeek = Math.min(
    Math.max(getStudyPosition(data.settings.startDate).weekNumber, 1),
    data.curriculum.length,
  );

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Маршрут · {data.settings.coreWeeks} основных недель + {data.settings.bufferWeeks} буферная
          </p>
          <h1>Учебный план</h1>
          <p>Каждый день — 50 минут теории, 50 минут практики и 20 минут повторения.</p>
        </div>
        <div className="header-stat"><Clock3 size={20} /><strong>168 ч</strong><span>с буфером</span></div>
      </header>

      <div className="week-list">
        {data.curriculum.map((week) => {
          const blocks = week.days.flatMap((day) => day.blocks);
          const done = blocks.filter((block) => data.progress.tasks[block.id]?.completed).length;
          const progress = Math.round((done / blocks.length) * 100);
          return (
            <details className="week-card" key={week.number} open={week.number === currentWeek}>
              <summary>
                <div className={week.isBuffer ? "week-number buffer" : "week-number"}>
                  {String(week.number).padStart(2, "0")}
                </div>
                <div className="week-summary-copy">
                  <span>{week.isBuffer ? "Буферная неделя" : `Неделя ${week.number}`}</span>
                  <h2>{week.title}</h2>
                  <p>{week.outcome}</p>
                </div>
                <div className="week-progress">
                  <strong>{progress}%</strong>
                  <span>{done}/{blocks.length}</span>
                </div>
                <ChevronDown className="summary-chevron" size={22} />
              </summary>

              <div className="week-days">
                {week.days.map((day) => (
                  <section className="plan-day" key={day.id}>
                    <div className="plan-day-heading">
                      <span>День {day.dayNumber}</span>
                      <strong>{day.title}</strong>
                    </div>
                    <div className="plan-blocks">
                      {day.blocks.map((block) => {
                        const task = data.progress.tasks[block.id] ?? { completed: false };
                        const lesson = lessons[block.id];
                        const isGenerating = generatingLessonId === block.id;
                        const supportsLesson = block.kind !== "review";
                        return (
                          <div
                            className={task.completed ? "plan-block complete" : "plan-block"}
                            key={block.id}
                          >
                            <UnstyledButton
                              className="plan-block-toggle"
                              type="button"
                              onClick={() => void onUpdateTask(block.id, {
                                completed: !task.completed,
                              })}
                              aria-pressed={task.completed}
                            >
                              <span className="small-check"><Check size={14} /></span>
                              <span>
                                <strong>{block.title}</strong>
                                <small>{block.minutes} минут</small>
                              </span>
                            </UnstyledButton>
                            <ResourceLinks
                              compact
                              resourceIds={block.resourceIds}
                              resources={data.resources}
                            />
                            {supportsLesson && data.ai.enabled ? (
                              <div className="plan-block-actions">
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
                                    leftSection={
                                      isGenerating ? <Loader size={14} /> : <Sparkles size={15} />
                                    }
                                    size="xs"
                                    type="button"
                                    onClick={() => onGenerateLesson(block.id)}
                                  >
                                    {isGenerating
                                      ? `Готовим разбор… ${generationCharacters}`
                                      : "Сделать разбор"}
                                  </Button>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
