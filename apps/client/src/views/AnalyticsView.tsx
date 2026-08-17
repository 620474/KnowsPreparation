import { Button, Progress } from "@mantine/core";
import { ArrowLeft, BrainCircuit, CheckCircle2, Clock3, Gauge } from "lucide-react";

import { calculateProgressAnalytics } from "../lib/progress-analytics";
import type { BootstrapData } from "../types";

interface AnalyticsViewProps {
  data: BootstrapData;
  onBack: () => void;
  onOpenMock: () => void;
  onOpenReview: () => void;
}

export function AnalyticsView({ data, onBack, onOpenMock, onOpenReview }: AnalyticsViewProps) {
  const analytics = calculateProgressAnalytics(data);

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
