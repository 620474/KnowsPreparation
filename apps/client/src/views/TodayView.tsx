import { useState, type CSSProperties } from "react";
import { Alert, Button, Loader, NumberInput, Progress, Select, Textarea } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  Clock3,
  Flame,
  MessagesSquare,
  Play,
  RefreshCw,
  Target,
  Trophy,
  FlaskConical,
  Route,
} from "lucide-react";

import { learningApi } from "../api";
import { CAREER_QUERY_KEY, getDueCareerApplications, getUpcomingCareerInterviews } from "../features/career/career";
import { useAdaptivePlan } from "../hooks/use-adaptive-plan";
import { useTodayMissions } from "../hooks/use-learning-missions";
import { getDateForOffset, getDayForOffset, getStudyPosition, getWeekForDay } from "../lib/date";
import { buildReviewQueue } from "../lib/review-queue";
import { RESEARCH_PROJECTS_QUERY_KEY } from "../lib/research";
import type { AdaptivePlanCheckIn, AdaptivePlanItem, BootstrapData, SkillKey } from "../types";
import { VerifiedCheckpointCard } from "../components/VerifiedCheckpointCard";

interface TodayViewProps {
  data: BootstrapData;
  onOpenDay: (dayId: string) => void;
  onOpenAnalytics: () => void;
  onOpenCareer: () => void;
  onOpenMock: () => void;
  onOpenReview: () => void;
  onOpenAdaptiveItem: (item: AdaptivePlanItem) => void;
  onOpenResearch: () => void;
  onOpenMission: (missionId: string) => void;
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

const trackLabels: Record<string, string> = {
  curriculum: "Основной план",
  course: "AI-курс",
  yandex: "Яндекс",
  ozon: "Ozon",
  avito: "Avito",
  tbank: "Т-Банк",
};

export function TodayView({
  data,
  onOpenDay,
  onOpenAnalytics,
  onOpenCareer,
  onOpenMock,
  onOpenReview,
  onOpenAdaptiveItem,
  onOpenResearch,
  onOpenMission,
}: TodayViewProps) {
  const researchProjects = useQuery({
    queryKey: RESEARCH_PROJECTS_QUERY_KEY,
    queryFn: learningApi.listResearchProjects,
  });
  const careerWorkspace = useQuery({
    queryKey: CAREER_QUERY_KEY,
    queryFn: learningApi.getCareerWorkspace,
  });
  const adaptive = useAdaptivePlan(data.settings.adaptiveTodayEnabled);
  const [checkIn, setCheckIn] = useState<AdaptivePlanCheckIn>({
    availableMinutes: data.settings.dailyMinutes,
    energy: "normal",
    focus: "mixed",
    note: "",
  });
  const knowledgeTarget = checkIn.focus === "yandex" || checkIn.focus === "ozon"
    ? checkIn.focus
    : "general";
  const missions = useTodayMissions(knowledgeTarget);
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
  const dueCareerActions = careerWorkspace.data
    ? getDueCareerApplications(careerWorkspace.data.applications)
    : [];
  const upcomingCareerInterviews = careerWorkspace.data
    ? getUpcomingCareerInterviews(careerWorkspace.data.applications)
    : [];

  if (!day || !week) return null;

  const nextBlock = day.blocks.find((block) => !data.progress.tasks[block.id]?.completed);
  const primaryRecommendation = data.settings.adaptiveTodayEnabled
    ? adaptive.plan?.items[0]
    : undefined;

  return (
    <div className="page-stack today-dashboard">
      <section className="hero-grid today-hero-grid">
        <div className="hero-card today-hero-card">
          <div className="hero-topline">
            <span className="status-pill"><Flame size={15} /> День {day.offset + 1}</span>
            <span>{getDateForOffset(data.settings.startDate, day.offset)}</span>
          </div>
          <p className="eyebrow">
            {primaryRecommendation
              ? "Следующее лучшее действие"
              : `Неделя ${week.number} · ${week.isBuffer ? "Буфер" : "Основной план"}`}
          </p>
          <h1>{primaryRecommendation?.title ?? day.title}</h1>
          <p>
            {primaryRecommendation?.reason ??
              (nextBlock
                ? `Следующий шаг: ${nextBlock.title}`
                : "План на сегодня полностью завершён.")}
          </p>
          <div className="hero-meta">
            <span><Clock3 size={18} /> {primaryRecommendation?.minutes ?? data.settings.dailyMinutes} минут</span>
            <span>
              <Target size={18} />
              {primaryRecommendation
                ? primaryRecommendation.skillKeys.map((skill) => skillLabels[skill]).join(" · ") || "Смешанная подготовка"
                : `${dayCompleted} из ${day.blocks.length} блоков`}
            </span>
          </div>
          <div className="today-hero-actions">
            <Button
              className="primary-button today-primary-action"
              rightSection={<ArrowRight size={17} />}
              type="button"
              onClick={() => primaryRecommendation
                ? onOpenAdaptiveItem(primaryRecommendation)
                : onOpenDay(day.id)}
            >
              {primaryRecommendation
                ? "Начать"
                : dayProgress === 100
                  ? "Посмотреть день"
                  : nextBlock
                    ? "Продолжить день"
                    : "Открыть день"}
            </Button>
            {primaryRecommendation ? (
              <Button
                className="secondary-button today-primary-action"
                type="button"
                variant="default"
                onClick={() => onOpenDay(day.id)}
              >
                План по календарю
              </Button>
            ) : null}
          </div>
        </div>

        <div className="progress-card today-progress-card">
          <div className="progress-dial" style={dialStyle}>
            <div>
              <strong>{totalProgress}%</strong>
              <span>всего</span>
            </div>
          </div>
          <div>
            <p className="eyebrow">Покрытие плана</p>
            <h2>{completedCount} / {allBlocks.length}</h2>
            <p>Это выполненные блоки, а не оценка готовности к интервью.</p>
          </div>
        </div>
      </section>

      <VerifiedCheckpointCard targetId={knowledgeTarget} availableMinutes={checkIn.availableMinutes} />

      {missions.data?.enabled && missions.data.missions.length ? (
        <section className="today-missions-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Decision Engine · максимум 3 цели</p>
              <h2>Миссии, которые нужно доказать</h2>
              <p>Каждая цель закрывается только после немедленной и отложенной проверки.</p>
            </div>
            <Route size={28} />
          </div>
          <div className="today-mission-list">
            {missions.data.missions.map((mission) => (
              <button key={mission.missionId} type="button" onClick={() => onOpenMission(mission.missionId)}>
                <span className={`mission-state mission-state-${mission.status}`}>{mission.status.replaceAll("_", " ")}</span>
                <strong>{mission.title}</strong>
                <small>{mission.reason}</small>
                <span className="today-mission-link">Открыть миссию <ArrowRight size={15} /></span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {data.settings.adaptiveTodayEnabled ? (
        <section className="adaptive-today-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Адаптивный маршрут · {adaptive.plan?.totalMinutes ?? 0} минут</p>
              <h2>Что даст максимум сегодня</h2>
              <p>Приоритеты собраны из повторений, тестов, практики, моков и ближайших интервью.</p>
            </div>
            {adaptive.isPending && !adaptive.plan ? <Loader color="brand" size="sm" /> : null}
          </div>
          <details className="adaptive-check-in">
            <summary>Настроить время, энергию и фокус</summary>
            <div>
              <NumberInput
                label="Сколько минут есть"
                min={15}
                max={360}
                value={checkIn.availableMinutes}
                onChange={(value) => setCheckIn({
                  ...checkIn,
                  availableMinutes: typeof value === "number" ? value : 120,
                })}
              />
              <Select
                label="Энергия"
                data={[
                  { value: "low", label: "Низкая" },
                  { value: "normal", label: "Обычная" },
                  { value: "high", label: "Высокая" },
                ]}
                value={checkIn.energy}
                onChange={(value) => setCheckIn({
                  ...checkIn,
                  energy: (value ?? "normal") as AdaptivePlanCheckIn["energy"],
                })}
              />
              <Select
                label="Главный фокус"
                data={[
                  { value: "mixed", label: "Смешанный" },
                  { value: "yandex", label: "Яндекс" },
                  { value: "ozon", label: "Ozon" },
                  { value: "core", label: "Frontend core" },
                  { value: "job_search", label: "Поиск работы" },
                ]}
                value={checkIn.focus}
                onChange={(value) => setCheckIn({
                  ...checkIn,
                  focus: (value ?? "mixed") as AdaptivePlanCheckIn["focus"],
                })}
              />
              <Textarea
                label="Что обязательно учесть"
                placeholder="Например: завтра интервью, тяжело концентрироваться…"
                value={checkIn.note}
                onChange={(event) => setCheckIn({ ...checkIn, note: event.currentTarget.value })}
              />
              <Button
                className="primary-button"
                loading={adaptive.isGenerating}
                type="button"
                onClick={() => adaptive.generate(checkIn)}
              >
                Пересобрать план
              </Button>
            </div>
          </details>
          {adaptive.plan?.rationale ? <p className="adaptive-rationale">{adaptive.plan.rationale}</p> : null}
          {adaptive.error ? <Alert color="yellow">{adaptive.error.message}</Alert> : null}
          {adaptive.isFallback && !adaptive.plan ? (
            <Alert color="yellow" variant="light">
              Адаптивный план сейчас недоступен. Обычный план дня остаётся доступен.
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
                    {item.v6?.crossTrack ? (
                      <div className={`adaptive-cross-track ${item.v6.crossTrack.mode}`}>
                        <span>
                          {item.v6.crossTrack.mode === "verify" ? "Перенос знаний" : "Частичное пересечение"}
                        </span>
                        <small>
                          Из: {item.v6.crossTrack.sourceTracks.map((track) => trackLabels[track] ?? track).join(", ")}
                        </small>
                      </div>
                    ) : null}
                    {item.v6?.reasonCodes.length ? (
                      <div className="adaptive-reason-codes">
                        {item.v6.reasonCodes.map((reason) => <span key={reason}>{reason}</span>)}
                      </div>
                    ) : null}
                  </div>
                  <div className="adaptive-today-actions">
                    <Button
                      className="primary-button"
                      leftSection={item.v6?.crossTrack?.mode === "verify" ? <Check size={15} /> : <Play size={15} />}
                      size="xs"
                      type="button"
                      onClick={() => onOpenAdaptiveItem(item)}
                    >
                      {item.v6?.crossTrack?.mode === "verify" ? "Подтвердить" : "Начать"}
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
        <Progress color="brand" radius="xl" size="sm" value={dayProgress} />
      </section>

      <section className="today-training-grid">
        <article>
          <BrainCircuit size={25} />
          <div className="today-training-copy"><strong>{reviewQueue.length}</strong><span>вопросов на сегодня</span></div>
          <Button className="primary-button" type="button" onClick={onOpenReview}>Начать повторение</Button>
        </article>
        <article>
          <MessagesSquare size={25} />
          <div className="today-training-copy"><strong>Интервью</strong><span>платформа, код и защита</span></div>
          <Button className="secondary-button" type="button" variant="default" onClick={onOpenMock}>Начать тренировку</Button>
        </article>
        <article>
          <BarChart3 size={25} />
          <div className="today-training-copy"><strong>Слабые темы</strong><span>по тестам и ответам</span></div>
          <Button className="secondary-button" type="button" variant="default" onClick={onOpenAnalytics}>Открыть аналитику</Button>
        </article>
      </section>

      <details className="today-secondary-zone">
        <summary>
          <span>
            <strong>Дополнительно</strong>
            <small>Исследования и поиск работы</small>
          </span>
          <ArrowRight size={18} />
        </summary>
        <div className="today-secondary-grid">
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

          <section className="today-focus-panel research-today-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Поиск работы</p>
                <h2>{dueCareerActions.length ? `${dueCareerActions.length} действий требуют внимания` : "Карьерная воронка"}</h2>
              </div>
              <BriefcaseBusiness size={25} />
            </div>
            <p>
              {upcomingCareerInterviews.length
                ? `Ближайших интервью: ${upcomingCareerInterviews.length}. Проверь подготовку и договорённости.`
                : "Фиксируй отклики, follow-up и результаты собеседований, чтобы видеть реальную конверсию."}
            </p>
            <Button className="secondary-button" type="button" variant="default" onClick={onOpenCareer}>
              Открыть поиск работы
            </Button>
          </section>
        </div>
      </details>

    </div>
  );
}
