import { useState } from "react";
import { Button, Progress, Textarea } from "@mantine/core";
import { ArrowLeft, Brain, CheckCircle2 } from "lucide-react";

import { buildReviewQueue } from "../lib/review-queue";
import type {
  BootstrapData,
  ReviewRating,
} from "../types";

interface ReviewViewProps {
  data: BootstrapData;
  onBack: () => void;
  onReview: (questionId: string, rating: ReviewRating, note: string) => Promise<boolean>;
}

const ratings: Array<{ value: ReviewRating; label: string; className: string }> = [
  { value: "again", label: "Не помню", className: "again" },
  { value: "hard", label: "Трудно", className: "hard" },
  { value: "good", label: "Хорошо", className: "good" },
  { value: "easy", label: "Легко", className: "easy" },
];

export function ReviewView({ data, onBack, onReview }: ReviewViewProps) {
  const [queue] = useState(() => buildReviewQueue(data.questions, data.progress.questions));
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(queue.map((entry) => [entry.question.id, entry.progress.note])),
  );
  const [saving, setSaving] = useState(false);
  const item = queue[index];

  if (!item) {
    return (
      <div className="page-stack narrow-page">
        <section className="review-complete-card">
          <CheckCircle2 size={42} />
          <p className="eyebrow">Повторение завершено</p>
          <h1>На сегодня всё</h1>
          <p>Следующие вопросы появятся автоматически по расписанию.</p>
          <Button className="primary-button" type="button" onClick={onBack}>
            Вернуться на сегодня
          </Button>
        </section>
      </div>
    );
  }

  const handleRating = async (rating: ReviewRating) => {
    setSaving(true);
    const saved = await onReview(item.question.id, rating, notes[item.question.id] ?? "");
    setSaving(false);
    if (saved) setIndex((current) => current + 1);
  };

  return (
    <div className="page-stack narrow-page">
      <header className="page-header review-header">
        <Button
          className="secondary-button"
          leftSection={<ArrowLeft size={17} />}
          type="button"
          variant="default"
          onClick={onBack}
        >
          Назад
        </Button>
        <div>
          <p className="eyebrow">Интервальные повторения</p>
          <h1>{index + 1} из {queue.length}</h1>
        </div>
      </header>
      <Progress value={(index / queue.length) * 100} color="mint" size="sm" />

      <article className="review-question-card">
        <div className="review-question-meta">
          <span><Brain size={16} /> {item.question.category}</span>
          <span>{item.isNew ? "Новый вопрос" : `Интервал ${item.progress.intervalDays} дн.`}</span>
        </div>
        <h2>{item.question.prompt}</h2>
        <p>Ответь вслух за 3–5 минут, затем честно оцени, насколько уверенно получилось.</p>
        <Textarea
          value={notes[item.question.id] ?? ""}
          label="Тезисы ответа"
          minRows={5}
          placeholder="Ключевые пункты, пример из опыта, что нужно уточнить…"
          onChange={(event) => {
            const value = event.currentTarget.value;
            setNotes((current) => ({
              ...current,
              [item.question.id]: value,
            }));
          }}
        />
        <div className="review-rating-grid">
          {ratings.map((rating) => (
            <Button
              key={rating.value}
              className={`review-rating ${rating.className}`}
              disabled={saving}
              loading={saving}
              type="button"
              variant="default"
              onClick={() => void handleRating(rating.value)}
            >
              {rating.label}
            </Button>
          ))}
        </div>
      </article>
    </div>
  );
}
