import type { CSSProperties } from "react";
import { ActionIcon, Alert, Button, Loader, Textarea } from "@mantine/core";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  Clock3,
  Flame,
  MessageCircle,
  MessagesSquare,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import { ResourceLinks } from "../components/ResourceLinks";
import { TaskWorkspace } from "../components/TaskWorkspace";
import { useAdaptivePlan } from "../hooks/use-adaptive-plan";
import { getDateForOffset, getDayForOffset, getStudyPosition, getWeekForDay } from "../lib/date";
import { buildReviewQueue } from "../lib/review-queue";
import type {
  AdaptivePlanItem,
  BootstrapData,
  SkillKey,
  TaskUpdateHandler,
} from "../types";

interface TodayViewProps {
  data: BootstrapData;
  generatingLessonId: string | null;
  generationCharacters: number;
  onGenerateLesson: (blockId: string) => void;
  onOpenLesson: (blockId: string) => void;
  onOpenChat: (blockId: string) => void;
  onUpdateTask: TaskUpdateHandler;
  onOpenAnalytics: () => void;
  onOpenMock: () => void;
  onOpenReview: () => void;
  onOpenAdaptiveItem: (item: AdaptivePlanItem) => void;
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
  generatingLessonId,
  generationCharacters,
  onGenerateLesson,
  onOpenLesson,
  onOpenChat,
  onUpdateTask,
  onOpenAnalytics,
  onOpenMock,
  onOpenReview,
  onOpenAdaptiveItem,
}: TodayViewProps) {
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

      {data.settings.adaptiveTodayEnabled ? (
        <section className="adaptive-today-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Адаптивный маршрут · {adaptive.plan?.totalMinutes ?? 0} минут</p>
              <h2>Что даст максимум сегодня</h2>
              <p>Приоритеты собраны из повторений, тестов, практики и моков.</p>
            </div>
            {adaptive.isPending && !adaptive.plan ? <Loader color="mint" size="sm" /> : null}
          </div>
          {adaptive.isFallback && !adaptive.plan ? (
            <Alert color="yellow" variant="light">
              Адаптивный план сейчас недоступен. Ниже остаётся обычный план по календарю.
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
            <p>На сегодня обязательных повторений нет — продолжай обычный план.</p>
          ) : null}
        </section>
      ) : null}

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
            const lesson = data.ai.lessons.curriculum[block.id];
            const isGenerating = generatingLessonId === block.id;
            const supportsLesson = block.kind !== "review";
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
                  {supportsLesson && data.ai.enabled ? (
                    <div className="today-lesson-actions">
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
                  {block.kind === "practice" || block.kind === "ai" ? (
                    <TaskWorkspace
                      includeCustomTask={block.kind === "ai"}
                      onUpdateTask={onUpdateTask}
                      progress={progress}
                      runner={block.exercise?.runner}
                      taskId={block.id}
                      taskTitle={block.title}
                      track="curriculum"
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
