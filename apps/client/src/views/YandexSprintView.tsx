import type { CSSProperties } from "react";
import { Alert, Button, Progress, UnstyledButton } from "@mantine/core";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  RotateCcw,
  Target,
} from "lucide-react";

import type { BootstrapData, StudyDay, TrackKey } from "../types";

interface YandexSprintViewProps {
  data: BootstrapData;
  sprintDays?: StudyDay[];
  eyebrow?: string;
  title?: string;
  description?: string;
  weekTitles?: string[];
  track?: Extract<TrackKey, "yandex" | "ozon">;
  onOpenDay: (dayId: string) => void;
}

const WEEK_TITLES = [
  "JS core и Big-O",
  "Асинхронность и структуры",
  "Интервью-режим",
];

export function YandexSprintView({
  data,
  sprintDays: providedSprintDays,
  eyebrow = "Главный приоритет · 21 день",
  title = "Подготовка к Яндексу",
  description = "Иди по дням с начала: платформа, задачи, AI-секция и короткий разбор результата.",
  weekTitles = WEEK_TITLES,
  track = "yandex",
  onOpenDay,
}: YandexSprintViewProps) {
  const sprintDays = providedSprintDays ?? data.yandexSprint ?? [];
  const allBlocks = sprintDays.flatMap((day) => day.blocks);
  const completedBlocks = allBlocks.filter(
    (block) => data.progress.tasks[block.id]?.completed,
  ).length;
  const totalProgress = allBlocks.length
    ? Math.round((completedBlocks / allBlocks.length) * 100)
    : 0;
  const nextDay = sprintDays.find((day) =>
    day.blocks.some((block) => !data.progress.tasks[block.id]?.completed),
  ) ?? sprintDays[0];
  const nextBlock = nextDay?.blocks.find(
    (block) => !data.progress.tasks[block.id]?.completed,
  );
  const weeks = Array.from({ length: Math.ceil(sprintDays.length / 7) }, (_, weekIndex) =>
    sprintDays.slice(weekIndex * 7, weekIndex * 7 + 7),
  );
  const totalMinutes = allBlocks.reduce((sum, block) => sum + block.minutes, 0);
  const dialStyle = { "--progress": `${totalProgress * 3.6}deg` } as CSSProperties;

  return (
    <div className="page-stack today-dashboard sprint-dashboard">
      <section className="hero-grid today-hero-grid">
        <div className="hero-card today-hero-card">
          <div className="hero-topline">
            <span className="status-pill"><Target size={15} /> {track === "yandex" ? "Приоритет №1" : "Приоритет №2"}</span>
            <span>{Math.round(totalMinutes / 60)} часов</span>
          </div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{nextBlock ? `Следующий шаг: ${nextBlock.title}` : description}</p>
          <div className="hero-meta">
            <span><Clock3 size={18} /> 120 минут в день</span>
            <span><Target size={18} /> {completedBlocks} из {allBlocks.length} блоков</span>
          </div>
          <div className="sprint-hero-actions">
            <Button
              className="primary-button today-primary-action"
              disabled={!nextDay}
              rightSection={<ArrowRight size={17} />}
              type="button"
              onClick={() => nextDay && onOpenDay(nextDay.id)}
            >
              {totalProgress === 100 ? "Посмотреть программу" : "Продолжить подготовку"}
            </Button>
            <Button
              className="secondary-button"
              disabled={!sprintDays[0]}
              leftSection={<RotateCcw size={16} />}
              type="button"
              variant="default"
              onClick={() => sprintDays[0] && onOpenDay(sprintDays[0].id)}
            >
              Начать с первого дня
            </Button>
          </div>
        </div>

        <div className="progress-card today-progress-card">
          <div className="progress-dial" style={dialStyle}>
            <div>
              <strong>{totalProgress}%</strong>
              <span>готово</span>
            </div>
          </div>
          <div>
            <p className="eyebrow">Прогресс спринта</p>
            <h2>{completedBlocks} / {allBlocks.length}</h2>
            <p>{nextDay ? `Продолжение — день ${nextDay.dayNumber}.` : "Все блоки завершены."}</p>
          </div>
        </div>
      </section>

      {!data.ai.enabled ? (
        <Alert color="orange" icon={<CircleAlert size={18} />} variant="light">
          AI-разборы сейчас недоступны. Ссылки, задачи и сохранённые решения продолжат работать.
        </Alert>
      ) : null}

      <section className="sprint-days-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Программа по дням</p>
            <h2>Открывай один день за раз</h2>
            <p>{description}</p>
          </div>
        </div>

        <div className="week-list sprint-week-list">
          {weeks.map((days, weekIndex) => {
            const weekBlocks = days.flatMap((day) => day.blocks);
            const weekCompleted = weekBlocks.filter(
              (block) => data.progress.tasks[block.id]?.completed,
            ).length;
            const weekProgress = weekBlocks.length
              ? Math.round((weekCompleted / weekBlocks.length) * 100)
              : 0;

            return (
              <details className="week-card" key={weekIndex} open={weekIndex === 0 || days.some((day) => day.id === nextDay?.id)}>
                <summary>
                  <div className="week-number">{String(weekIndex + 1).padStart(2, "0")}</div>
                  <div className="week-summary-copy">
                    <span>Неделя {weekIndex + 1}</span>
                    <h2>{weekTitles[weekIndex] ?? `Неделя ${weekIndex + 1}`}</h2>
                    <p>{weekCompleted} из {weekBlocks.length} блоков завершено</p>
                  </div>
                  <div className="week-progress">
                    <strong>{weekProgress}%</strong>
                    <span>{weekCompleted}/{weekBlocks.length}</span>
                  </div>
                  <ChevronDown className="summary-chevron" size={22} />
                </summary>

                <div className="plan-day-list">
                  {days.map((day) => {
                    const completed = day.blocks.filter(
                      (block) => data.progress.tasks[block.id]?.completed,
                    ).length;
                    const dayProgress = day.blocks.length
                      ? Math.round((completed / day.blocks.length) * 100)
                      : 0;
                    const dayMinutes = day.blocks.reduce((sum, block) => sum + block.minutes, 0);
                    const isNext = day.id === nextDay?.id && totalProgress < 100;

                    return (
                      <UnstyledButton
                        className={isNext ? "plan-day-row current" : "plan-day-row"}
                        key={day.id}
                        type="button"
                        onClick={() => onOpenDay(day.id)}
                      >
                        <span className="plan-day-marker">
                          <small>День</small>
                          <strong>{String(day.dayNumber).padStart(2, "0")}</strong>
                        </span>
                        <span className="plan-day-copy">
                          <span className="plan-day-title-line">
                            <strong>{day.title}</strong>
                            {isNext ? <em>Дальше</em> : null}
                          </span>
                          <small>{dayMinutes} минут · {completed} из {day.blocks.length} блоков</small>
                          <Progress color="mint" radius="xl" size={5} value={dayProgress} />
                        </span>
                        <span className={dayProgress === 100 ? "plan-day-state complete" : "plan-day-state"}>
                          {dayProgress === 100 ? <Check size={18} /> : <span>{dayProgress}%</span>}
                          <ChevronRight size={19} />
                        </span>
                      </UnstyledButton>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
