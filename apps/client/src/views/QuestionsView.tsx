import { useMemo, useState } from "react";
import { Button, Select, Textarea, TextInput } from "@mantine/core";
import { BarChart3, BrainCircuit, CheckCircle2, MessagesSquare, Search } from "lucide-react";

import { normalizeQuestionProgress } from "../lib/question-progress";
import type { BootstrapData, QuestionProgress, QuestionStatus } from "../types";

interface QuestionsViewProps {
  data: BootstrapData;
  onUpdateQuestion: (questionId: string, progress: QuestionProgress) => void;
  onOpenAnalytics: () => void;
  onOpenMock: () => void;
  onOpenReview: () => void;
}

const statusLabels: Record<QuestionStatus, string> = {
  new: "Не начато",
  learning: "Изучаю",
  review: "Повторить",
  mastered: "Готово",
};

const questionStatusOptions: Array<{ value: QuestionStatus; label: string }> = Object.entries(
  statusLabels,
).map(([value, label]) => ({ value: value as QuestionStatus, label }));

const filterStatusOptions: Array<{ value: QuestionStatus | "all"; label: string }> = [
  { value: "all", label: "Все статусы" },
  ...questionStatusOptions,
];

export function QuestionsView({
  data,
  onUpdateQuestion,
  onOpenAnalytics,
  onOpenMock,
  onOpenReview,
}: QuestionsViewProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [status, setStatus] = useState<QuestionStatus | "all">("all");
  const categories = ["Все", ...new Set(data.questions.map((question) => question.category))];
  const mastered = data.questions.filter(
    (question) => data.progress.questions[question.id]?.status === "mastered",
  ).length;

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");
    return data.questions.filter((question) => {
      const progress = normalizeQuestionProgress(data.progress.questions[question.id]);
      return (
        (category === "Все" || question.category === category) &&
        (status === "all" || progress.status === status) &&
        (!normalizedQuery || question.prompt.toLocaleLowerCase("ru").includes(normalizedQuery))
      );
    });
  }, [category, data.progress.questions, data.questions, query, status]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Самопроверка</p>
          <h1>{data.questions.length} вопросов без шпаргалки</h1>
          <p>Тема закрыта, когда ответ занимает 3–5 минут и опирается на реальный опыт.</p>
        </div>
        <div className="questions-header-actions">
          <div className="header-stat accent"><CheckCircle2 size={20} /><strong>{mastered}</strong><span>готово</span></div>
          <Button className="primary-button" leftSection={<BrainCircuit size={17} />} type="button" onClick={onOpenReview}>Повторить</Button>
          <Button className="secondary-button" leftSection={<MessagesSquare size={17} />} type="button" variant="default" onClick={onOpenMock}>Мок</Button>
          <Button className="secondary-button" leftSection={<BarChart3 size={17} />} type="button" variant="default" onClick={onOpenAnalytics}>Аналитика</Button>
        </div>
      </header>

      <section className="filter-bar">
        <TextInput
          className="search-control"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти вопрос…"
          aria-label="Поиск вопросов"
          leftSection={<Search size={18} />}
          size="md"
        />
        <Select
          value={category}
          data={categories}
          onChange={(value) => value && setCategory(value)}
          allowDeselect={false}
          aria-label="Категория"
          size="md"
        />
        <Select<QuestionStatus | "all">
          value={status}
          data={filterStatusOptions}
          onChange={(value) => value && setStatus(value)}
          allowDeselect={false}
          aria-label="Статус"
          size="md"
        />
      </section>

      <div className="question-list">
        {filteredQuestions.map((question) => {
          const progress = normalizeQuestionProgress(data.progress.questions[question.id]);
          return (
            <article className={`question-card status-${progress.status}`} key={question.id}>
              <div className="question-index">{String(question.number).padStart(2, "0")}</div>
              <div className="question-main">
                <span>{question.category}</span>
                <h2>{question.prompt}</h2>
                <Textarea
                  className="question-note"
                  defaultValue={progress.note}
                  placeholder="Тезисы ответа, пример из опыта, слабое место…"
                  aria-label={`Заметка к вопросу ${question.number}`}
                  minRows={2}
                  onBlur={(event) =>
                    onUpdateQuestion(question.id, { ...progress, note: event.target.value })
                  }
                />
              </div>
              <Select<QuestionStatus>
                className="status-select"
                value={progress.status}
                data={questionStatusOptions}
                allowDeselect={false}
                aria-label={`Статус вопроса ${question.number}`}
                onChange={(value) =>
                  value && onUpdateQuestion(question.id, { ...progress, status: value })
                }
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
