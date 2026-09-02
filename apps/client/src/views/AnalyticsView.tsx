import { useState } from "react";
import { Button, Loader, Progress, SegmentedControl } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BrainCircuit, CheckCircle2, Clock3, Gauge } from "lucide-react";

import { learningApi } from "../api";
import { calculateProgressAnalytics } from "../lib/progress-analytics";
import type { BootstrapData } from "../types";

interface AnalyticsViewProps {
  data: BootstrapData;
  onBack: () => void;
  onOpenMock: () => void;
  onOpenReview: () => void;
}

const formatPercent = (value: number | null) => value === null ? "—" : `${value}%`;

const readinessLabels = {
  recall: ["Вспомнить", "Ответить без подсказки"],
  code: ["Написать", "Решить и пройти тесты"],
  explain: ["Объяснить", "Разобрать решение вслух"],
  defend: ["Защитить", "Ответить на уточнения"],
} as const;

export function AnalyticsView({ data, onBack, onOpenMock, onOpenReview }: AnalyticsViewProps) {
  const analytics = calculateProgressAnalytics(data);
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const learningAnalytics = useQuery({
    queryKey: ["learning-analytics", windowDays],
    queryFn: () => learningApi.getLearningAnalytics(windowDays),
  });
  const maxActivity = Math.max(
    1,
    ...(learningAnalytics.data?.days.map((day) => day.activityCount) ?? []),
  );

  return (
    <div className="page-stack">
      <header className="page-header analytics-header">
        <div>
          <Button
            className="secondary-button"
            leftSection={<ArrowLeft size={17} />}
            type="button"
            variant="default"
            onClick={onBack}
          >
            К вопросам
          </Button>
          <p className="eyebrow">Аналитика подготовки</p>
          <h1>Слабые темы без догадок</h1>
          <p>Статусы вопросов, ошибки в тестах статей и результаты мок-интервью.</p>
        </div>
        <div className="page-header-actions">
          <Button className="primary-button" type="button" onClick={onOpenReview}>
            Повторить сегодня
          </Button>
          <Button className="secondary-button" type="button" variant="default" onClick={onOpenMock}>
            Мок-интервью
          </Button>
        </div>
      </header>

      <section className="analytics-stat-grid">
        <article><CheckCircle2 /><strong>{analytics.mastered}</strong><span>вопросов освоено</span></article>
        <article><Clock3 /><strong>{analytics.due}</strong><span>просрочено</span></article>
        <article><BrainCircuit /><strong>{analytics.reviewCount}</strong><span>повторений</span></article>
        <article><Gauge /><strong>{analytics.averageMockScore ?? "—"}</strong><span>средний балл моков</span></article>
      </section>

      <section className="analytics-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Readiness evidence</p>
            <h2>Что уже получается самостоятельно</h2>
            <p>Показатели разделены: прочитанный материал сам по себе не считается готовностью.</p>
          </div>
        </div>
        {learningAnalytics.data ? (
          <div className="analytics-skill-list readiness-dimension-list">
            {Object.entries(learningAnalytics.data.readiness).map(([key, dimension]) => {
              const [label, description] = readinessLabels[key as keyof typeof readinessLabels];
              return (
                <article key={key}>
                  <div>
                    <strong>{label}</strong>
                    <span>{description} · {dimension.signalCount} сигналов</span>
                  </div>
                  <Progress
                    color={dimension.score === null ? "gray" : "mint"}
                    value={dimension.score ?? 0}
                    size="md"
                  />
                  <b>{formatPercent(dimension.score)}</b>
                </article>
              );
            })}
          </div>
        ) : (
          <p>После практики и мок-интервью здесь появятся независимые показатели готовности.</p>
        )}
      </section>

      <section className="analytics-panel">
        <div className="section-heading analytics-dynamics-heading">
          <div>
            <p className="eyebrow">Измеренный прогресс</p>
            <h2>Динамика за {windowDays} дней</h2>
          </div>
          <SegmentedControl
            aria-label="Период аналитики"
            data={[
              { label: "7 дней", value: "7" },
              { label: "30 дней", value: "30" },
            ]}
            value={String(windowDays)}
            onChange={(value) => setWindowDays(value === "30" ? 30 : 7)}
          />
        </div>
        {learningAnalytics.isPending && !learningAnalytics.data ? (
          <div className="analytics-loading"><Loader color="mint" size="sm" /> Считаю сигналы…</div>
        ) : learningAnalytics.isError && !learningAnalytics.data ? (
          <p>История пока недоступна. Локальная аналитика ниже продолжает работать.</p>
        ) : learningAnalytics.data ? (
          <>
            <div className="analytics-signal-summary">
              <span><strong>{learningAnalytics.data.totals.activityCount}</strong> действий</span>
              <span><strong>{formatPercent(learningAnalytics.data.totals.practicePassRate)}</strong> практики пройдено</span>
              <span><strong>{formatPercent(learningAnalytics.data.totals.quizAverage)}</strong> средний квиз</span>
              <span><strong>{learningAnalytics.data.totals.reviews}</strong> повторений</span>
            </div>
            <div className="analytics-timeline" aria-label="Активность по дням">
              {learningAnalytics.data.days.map((day) => (
                <div key={day.date} title={`${day.date}: ${day.activityCount} действий`}>
                  <span style={{ height: `${Math.max(4, (day.activityCount / maxActivity) * 100)}%` }} />
                  <small>{new Date(`${day.date}T00:00:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</small>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="analytics-panel">
        <div className="section-heading">
          <div><p className="eyebrow">Карта навыков</p><h2>Где нужен следующий подход</h2></div>
        </div>
        {learningAnalytics.data?.skills.some((skill) => skill.signalCount > 0) ? (
          <div className="analytics-skill-list">
            {learningAnalytics.data.skills
              .filter((skill) => skill.signalCount > 0)
              .map((skill) => (
                <article key={skill.key}>
                  <div><strong>{skill.label}</strong><span>{formatPercent(skill.score)} · {skill.signalCount} сигналов</span></div>
                  <Progress color="mint" value={skill.score ?? 0} size="md" />
                </article>
              ))}
          </div>
        ) : (
          <p>Пройди квиз, практику, повторение или мок — здесь появится динамика по навыкам.</p>
        )}
      </section>

      <section className="analytics-panel">
        <div className="section-heading">
          <div><p className="eyebrow">Банк вопросов</p><h2>Готовность по категориям</h2></div>
        </div>
        <div className="analytics-category-list">
          {analytics.categories.map((category) => (
            <article key={category.name}>
              <div><strong>{category.name}</strong><span>{category.mastered} из {category.total}</span></div>
              <Progress color="mint" value={category.masteryPercent} size="md" />
              <small>{category.due > 0 ? `Нужно повторить: ${category.due}` : "По расписанию всё закрыто"}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="analytics-panel">
        <div className="section-heading">
          <div><p className="eyebrow">AI-сигналы</p><h2>Темы с ошибками</h2></div>
        </div>
        {analytics.weakTopics.length > 0 ? (
          <div className="weak-topic-list">
            {analytics.weakTopics.map(({ topic, score }, index) => (
              <span key={topic}><b>{index + 1}</b>{topic}<small>{score} сигналов</small></span>
            ))}
          </div>
        ) : (
          <p>Пройди тесты статей или мок-интервью — здесь появятся персональные слабые темы.</p>
        )}
      </section>
    </div>
  );
}
