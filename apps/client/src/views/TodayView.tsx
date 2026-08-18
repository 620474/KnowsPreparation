import type { CSSProperties } from "react";
import { ActionIcon, Button, Textarea } from "@mantine/core";
import { BarChart3, BrainCircuit, Check, Clock3, MessagesSquare, Target, Trophy, Flame } from "lucide-react";

import { ResourceLinks } from "../components/ResourceLinks";
import { TaskWorkspace } from "../components/TaskWorkspace";
import { getDateForOffset, getDayForOffset, getStudyPosition, getWeekForDay } from "../lib/date";
import { buildReviewQueue } from "../lib/review-queue";
import type { BootstrapData, TaskUpdateHandler } from "../types";

interface TodayViewProps {
  data: BootstrapData;
  onUpdateTask: TaskUpdateHandler;
  onOpenAnalytics: () => void;
  onOpenMock: () => void;
  onOpenReview: () => void;
}

const kindLabels = {
  theory: "Теория",
  practice: "Практика",
  ai: "AI",
  review: "Повторение",
};

export function TodayView({
  data,
  onUpdateTask,
  onOpenAnalytics,
  onOpenMock,
  onOpenReview,
}: TodayViewProps) {
  const position = getStudyPosition(data.settings.startDate);
  const day = getDayForOffset(data.curriculum, position.rawOffset);
  const week = getWeekForDay(data.curriculum, day);
  const allBlocks = data.curriculum.flatMap((item) =>
    item.days.flatMap((studyDay) => studyDay.blocks),
  );
  const completedCount = allBlocks.filter(
    (block) => data.progress.tasks[block.id]?.completed,
  ).length;
  const totalProgress = Math.round((completedCount / allBlocks.length) * 100);
  const dayCompleted = day?.blocks.filter(
    (block) => data.progress.tasks[block.id]?.completed,
  ).length ?? 0;
  const dialStyle = { "--progress": `${totalProgress * 3.6}deg` } as CSSProperties;
  const reviewQueue = buildReviewQueue(data.questions, data.progress.questions);

  if (!day || !week) return null;

  return (
    <div className="page-stack">
      <section className="hero-grid">
        <div className="hero-card">
          <div className="hero-topline">
            <span className="status-pill"><Flame size={15} /> День {day.offset + 1}</span>
            <span>{getDateForOffset(data.settings.startDate, day.offset)}</span>
          </div>
          <p className="eyebrow">Неделя {week.number} · {week.isBuffer ? "Буфер" : "Основной план"}</p>
          <h1>Два часа до следующего уровня.</h1>
          <p>{week.title}. {week.outcome}</p>
          <div className="hero-meta">
            <span><Clock3 size={18} /> {data.settings.dailyMinutes} минут</span>
            <span><Target size={18} /> {dayCompleted} из {day.blocks.length} блоков</span>
          </div>
        </div>

        <div className="progress-card">
          <div className="progress-dial" style={dialStyle}>
            <div>
              <strong>{totalProgress}%</strong>
              <span>всего</span>
            </div>
          </div>
          <div>
            <p className="eyebrow">Общий прогресс</p>
            <h2>{completedCount} / {allBlocks.length}</h2>
            <p>Закрывай три небольших блока вместо одной размытой цели.</p>
          </div>
        </div>
      </section>

      <section className="today-training-grid">
        <article>
          <BrainCircuit size={25} />
          <div><strong>{reviewQueue.length}</strong><span>вопросов на сегодня</span></div>
          <Button className="primary-button" type="button" onClick={onOpenReview}>Начать повторение</Button>
        </article>
        <article>
          <MessagesSquare size={25} />
          <div><strong>5</strong><span>вопросов · 20 минут</span></div>
          <Button className="secondary-button" type="button" variant="default" onClick={onOpenMock}>Мок-интервью</Button>
        </article>
        <article>
          <BarChart3 size={25} />
          <div><strong>Слабые темы</strong><span>по тестам и ответам</span></div>
          <Button className="secondary-button" type="button" variant="default" onClick={onOpenAnalytics}>Открыть аналитику</Button>
        </article>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Фокус дня</p>
            <h2>{day.title}</h2>
          </div>
          {dayCompleted === day.blocks.length ? (
            <span className="complete-badge"><Trophy size={17} /> День закрыт</span>
          ) : null}
        </div>

        <div className="task-grid">
          {day.blocks.map((block, index) => {
            const progress = {
              completed: false,
              note: "",
              customTask: "",
              solution: "",
              ...data.progress.tasks[block.id],
            };
            return (
              <article className={progress.completed ? "task-card complete" : "task-card"} key={block.id}>
                <div className="task-number">0{index + 1}</div>
                <div className="task-content">
                  <div className="task-kicker">
                    <span>{kindLabels[block.kind]}</span>
                    <span>{block.minutes} мин</span>
                  </div>
                  <h3>{block.title}</h3>
                  <p>{block.description}</p>
                  <ResourceLinks resourceIds={block.resourceIds} resources={data.resources} />
                  {block.kind === "practice" || block.kind === "ai" ? (
                    <TaskWorkspace
                      includeCustomTask={block.kind === "ai"}
                      onUpdateTask={onUpdateTask}
                      progress={progress}
                      runner={block.exercise?.runner}
                      taskId={block.id}
                      taskTitle={block.title}
                    />
                  ) : null}
                  <Textarea
                    className="task-note"
                    aria-label={`Заметка: ${block.title}`}
                    defaultValue={progress.note}
                    placeholder="Короткая заметка или сложность…"
                    minRows={2}
                    onBlur={(event) =>
                      void onUpdateTask(block.id, { note: event.target.value })
                    }
                  />
                </div>
                <ActionIcon
                  className="task-check"
                  type="button"
                  variant="default"
                  radius="xl"
                  size={42}
                  aria-label={progress.completed ? "Вернуть задание" : "Завершить задание"}
                  aria-pressed={progress.completed}
                  onClick={() => void onUpdateTask(block.id, { completed: !progress.completed })}
                >
                  <Check size={20} />
                </ActionIcon>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
