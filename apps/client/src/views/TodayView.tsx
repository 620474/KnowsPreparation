import type { CSSProperties } from "react";
import { Alert, Button, Loader, Progress } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  Clock3,
  Flame,
  MessagesSquare,
  Play,
  RefreshCw,
  Target,
  Trophy,
  FlaskConical,
} from "lucide-react";

import { learningApi } from "../api";
import { useAdaptivePlan } from "../hooks/use-adaptive-plan";
import { getDateForOffset, getDayForOffset, getStudyPosition, getWeekForDay } from "../lib/date";
import { buildReviewQueue } from "../lib/review-queue";
import { RESEARCH_PROJECTS_QUERY_KEY } from "../lib/research";
import type { AdaptivePlanItem, BootstrapData, SkillKey } from "../types";

interface TodayViewProps {
  data: BootstrapData;
  onOpenDay: (dayId: string) => void;
  onOpenAnalytics: () => void;
  onOpenMock: () => void;
  onOpenReview: () => void;
  onOpenAdaptiveItem: (item: AdaptivePlanItem) => void;
  onOpenResearch: () => void;
}

const kindLabels = {
  theory: "Теория",
  practice: "Практика",
  ai: "AI",
  review: "Повторение",
};

const skillLabels = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  async: "Асинхронность",
  react: "React",
  browser: "Браузер",
  algorithms: "Алгоритмы",
  testing: "Тестирование",
  architecture: "Архитектура",
  "css-a11y": "CSS/A11y",
  ai: "AI",
} satisfies Record<SkillKey, string>;

export function TodayView({
  data,
  onOpenDay,
  onOpenAnalytics,
  onOpenMock,
  onOpenReview,
  onOpenAdaptiveItem,
  onOpenResearch,
}: TodayViewProps) {
  const researchProjects = useQuery({
    queryKey: RESEARCH_PROJECTS_QUERY_KEY,
    queryFn: learningApi.listResearchProjects,
  });
  const adaptive = useAdaptivePlan(data.settings.adaptiveTodayEnabled);
  const position = getStudyPosition(data.settings.startDate);
  const day = getDayForOffset(data.curriculum, position.rawOffset);
  const week = getWeekForDay(data.curriculum, day);
  const allBlocks = data.curriculum.flatMap((item) =>
    item.days.flatMap((studyDay) => studyDay.blocks),
  );
  const completedCount = allBlocks.filter(
    (block) => data.progress.tasks[block.id]?.completed,
  ).length;
  const totalProgress = allBlocks.length
    ? Math.round((completedCount / allBlocks.length) * 100)
    : 0;
  const dayCompleted = day?.blocks.filter(
    (block) => data.progress.tasks[block.id]?.completed,
  ).length ?? 0;
  const dayProgress = day?.blocks.length
    ? Math.round((dayCompleted / day.blocks.length) * 100)
    : 0;
  const dialStyle = { "--progress": `${totalProgress * 3.6}deg` } as CSSProperties;
  const reviewQueue = buildReviewQueue(data.questions, data.progress.questions);
  const activeResearch = researchProjects.data?.find((project) => project.status === "active");

  if (!day || !week) return null;

  const nextBlock = day.blocks.find((block) => !data.progress.tasks[block.id]?.completed);

  return (
    <div className="page-stack today-dashboard">
      <section className="hero-grid today-hero-grid">
        <div className="hero-card today-hero-card">
          <div className="hero-topline">
            <span className="status-pill"><Flame size={15} /> День {day.offset + 1}</span>
            <span>{getDateForOffset(data.settings.startDate, day.offset)}</span>
          </div>
          <p className="eyebrow">Неделя {week.number} · {week.isBuffer ? "Буфер" : "Основной план"}</p>
          <h1>{day.title}</h1>
          <p>{nextBlock ? `Следующий шаг: ${nextBlock.title}` : "План на сегодня полностью завершён."}</p>
          <div className="hero-meta">
            <span><Clock3 size={18} /> {data.settings.dailyMinutes} минут</span>
            <span><Target size={18} /> {dayCompleted} из {day.blocks.length} блоков</span>
          </div>
          <Button
            className="primary-button today-primary-action"
            rightSection={<ArrowRight size={17} />}
            type="button"
            onClick={() => onOpenDay(day.id)}
          >
            {dayProgress === 100 ? "Посмотреть день" : nextBlock ? "Продолжить день" : "Открыть день"}
          </Button>
        </div>

        <div className="progress-card today-progress-card">
          <div className="progress-dial" style={dialStyle}>
            <div>
              <strong>{totalProgress}%</strong>
              <span>всего</span>
            </div>
          </div>
          <div>
            <p className="eyebrow">Общий прогресс</p>
            <h2>{completedCount} / {allBlocks.length}</h2>
            <p>Текущий день закрыт на {dayProgress}%.</p>
          </div>
        </div>
      </section>

      <section className="today-focus-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Что изучаем сегодня</p>
            <h2>{day.title}</h2>
          </div>
          {dayCompleted === day.blocks.length ? (
            <span className="complete-badge"><Trophy size={17} /> День закрыт</span>
          ) : null}
        </div>

        <div className="today-block-list">
          {day.blocks.map((block, index) => {
            const completed = data.progress.tasks[block.id]?.completed;
            return (
              <button
                className={completed ? "today-block-row complete" : "today-block-row"}
                key={block.id}
                type="button"
                onClick={() => onOpenDay(day.id)}
              >
                <span className="today-block-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="today-block-copy">
                  <small>{kindLabels[block.kind]} · {block.minutes} минут</small>
                  <strong>{block.title}</strong>
                </span>
                <span className="today-block-check">
                  {completed ? <Check size={17} /> : <ArrowRight size={17} />}
                </span>
              </button>
            );
          })}
        </div>
        <Progress color="mint" radius="xl" size="sm" value={dayProgress} />
      </section>

      <section className="today-training-grid">
        <article>
          <BrainCircuit size={25} />
          <div><strong>{reviewQueue.length}</strong><span>вопросов на сегодня</span></div>
          <Button className="primary-button" type="button" onClick={onOpenReview}>Начать повторение</Button>
        </article>
        <article>
          <MessagesSquare size={25} />
          <div><strong>Интервью</strong><span>платформа, код и защита</span></div>
          <Button className="secondary-button" type="button" variant="default" onClick={onOpenMock}>Начать тренировку</Button>
        </article>
        <article>
          <BarChart3 size={25} />
          <div><strong>Слабые темы</strong><span>по тестам и ответам</span></div>
          <Button className="secondary-button" type="button" variant="default" onClick={onOpenAnalytics}>Открыть аналитику</Button>
        </article>
      </section>

      {activeResearch ? (
        <section className="today-focus-panel research-today-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Активное исследование</p>
              <h2>{activeResearch.title}</h2>
            </div>
            <FlaskConical size={25} />
          </div>
          <p>{activeResearch.nextAction || "Определи следующее конкретное действие по проекту."}</p>
          <Button className="secondary-button" type="button" variant="default" onClick={onOpenResearch}>
            Открыть контрольный центр
          </Button>
        </section>
      ) : null}

      {data.settings.adaptiveTodayEnabled ? (
        <section className="adaptive-today-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Адаптивный маршрут · {adaptive.plan?.totalMinutes ?? 0} минут</p>
              <h2>Что даст максимум сегодня</h2>
              <p>Дополнительные приоритеты собраны из повторений, тестов, практики и моков.</p>
            </div>
            {adaptive.isPending && !adaptive.plan ? <Loader color="mint" size="sm" /> : null}
          </div>
          {adaptive.isFallback && !adaptive.plan ? (
            <Alert color="yellow" variant="light">
              Адаптивный план сейчас недоступен. Обычный план дня остаётся выше.
            </Alert>
          ) : null}
          {adaptive.plan?.items.length ? (
            <div className="adaptive-today-list">
              {adaptive.plan.items.map((item, index) => (
                <article key={item.id}>
                  <span className="adaptive-today-index">{index + 1}</span>
                  <div>
                    <div className="adaptive-today-meta">
                      <span>{item.minutes} минут</span>
                      <span>{item.skillKeys.map((skill) => skillLabels[skill]).join(" · ")}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.reason}</p>
                  </div>
                  <div className="adaptive-today-actions">
                    <Button
                      className="primary-button"
                      leftSection={<Play size={15} />}
                      size="xs"
                      type="button"
                      onClick={() => onOpenAdaptiveItem(item)}
                    >
                      Начать
                    </Button>
                    <Button
                      className="secondary-button"
                      leftSection={<RefreshCw size={15} />}
                      size="xs"
                      type="button"
                      variant="default"
                      onClick={() => adaptive.skip(item.id)}
                    >
                      Заменить
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : adaptive.plan && !adaptive.isPending ? (
            <p>На сегодня дополнительных заданий нет — продолжай план по календарю.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
