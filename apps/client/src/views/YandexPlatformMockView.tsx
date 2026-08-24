import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Loader, Progress, Textarea } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock3,
  Play,
  RotateCcw,
  X,
} from "lucide-react";

import { learningApi } from "../api";
import type {
  YandexMockDayId,
  YandexMockVerdict,
  YandexPlatformMockAttempt,
} from "../types";

interface YandexPlatformMockViewProps {
  dayId: YandexMockDayId;
  onBack: () => void;
  onCompleteBlock: () => Promise<boolean>;
}

const dayLabels: Record<YandexMockDayId, string> = {
  "yandex-d07": "Мок №1 · JS core",
  "yandex-d14": "Мок №2 · асинхронность",
  "yandex-d21": "Финальный мок · платформа",
};

const formatRemaining = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function YandexPlatformMockView({
  dayId,
  onBack,
  onCompleteBlock,
}: YandexPlatformMockViewProps) {
  const queryClient = useQueryClient();
  const queryKey = ["yandex-platform-mock", dayId] as const;
  const attemptQuery = useQuery({
    queryKey,
    queryFn: () => learningApi.getYandexPlatformMock(dayId),
  });
  const [attempt, setAttempt] = useState<YandexPlatformMockAttempt | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(60 * 60);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const currentAttempt = attempt ?? attemptQuery.data ?? null;
  const question = currentAttempt?.questions[questionIndex];
  const draft = question ? drafts[question.id] ?? question.response : "";
  const gradedCount =
    currentAttempt?.questions.filter((item) => item.verdict !== null).length ?? 0;
  const allGraded = currentAttempt
    ? gradedCount === currentAttempt.questions.length
    : false;

  useEffect(() => {
    if (!currentAttempt || currentAttempt.status !== "in_progress") return;
    const update = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(currentAttempt.startedAt).getTime()) / 1_000,
      );
      setRemaining(
        Math.max(0, currentAttempt.durationMinutes * 60 - elapsed),
      );
    };
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [currentAttempt]);

  const applyAttempt = (next: YandexPlatformMockAttempt) => {
    setAttempt(next);
    queryClient.setQueryData(queryKey, next);
  };

  const run = async (
    key: string,
    action: () => Promise<YandexPlatformMockAttempt>,
  ) => {
    setBusy(key);
    setError("");
    try {
      const next = await action();
      applyAttempt(next);
      return next;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Не удалось сохранить попытку",
      );
      return null;
    } finally {
      setBusy("");
    }
  };

  const start = async () => {
    const next = await run("start", () => learningApi.startYandexPlatformMock(dayId));
    if (next) {
      setQuestionIndex(0);
      setDrafts({});
    }
  };

  const reveal = async () => {
    if (!currentAttempt || !question || !draft.trim()) {
      setError("Сначала зафиксируй прогноз и объяснение.");
      return;
    }
    await run("reveal", () =>
      learningApi.saveYandexPlatformMockResponse(
        currentAttempt.id,
        question.id,
        draft.trim(),
      ),
    );
  };

  const grade = async (verdict: YandexMockVerdict) => {
    if (!currentAttempt || !question) return;
    const next = await run("grade", () =>
      learningApi.gradeYandexPlatformMockResponse(
        currentAttempt.id,
        question.id,
        verdict,
      ),
    );
    if (!next) return;
    const nextQuestionIndex = next.questions.findIndex(
      (item, index) => index > questionIndex && item.verdict === null,
    );
    if (nextQuestionIndex >= 0) setQuestionIndex(nextQuestionIndex);
  };

  const completedSummary = useMemo(() => {
    if (!currentAttempt || currentAttempt.status !== "completed") return null;
    const correct = currentAttempt.questions.filter(
      (item) => item.verdict === "correct",
    ).length;
    return `${correct} из ${currentAttempt.questions.length}`;
  }, [currentAttempt]);

  const complete = async () => {
    if (!currentAttempt) return;
    const next = await run("complete", () =>
      learningApi.completeYandexPlatformMock(currentAttempt.id),
    );
    if (next?.status === "completed") await onCompleteBlock();
  };

  if (attemptQuery.isPending && !currentAttempt) {
    return <div className="view-loader"><Loader color="mint" /> Загружаю мок…</div>;
  }

  if (!currentAttempt || currentAttempt.status === "completed") {
    return (
      <div className="page-stack narrow-page yandex-platform-mock-page">
        <header className="page-header">
          <div>
            <Button
              className="secondary-button"
              leftSection={<ArrowLeft size={17} />}
              type="button"
              variant="default"
              onClick={onBack}
            >
              К дню
            </Button>
            <p className="eyebrow">Яндекс · платформенная секция</p>
            <h1>{dayLabels[dayId]}</h1>
            <p>
              Шесть JS-фрагментов. Сначала запиши прогноз и объяснение, только
              потом открывай правильный ответ.
            </p>
          </div>
        </header>

        {currentAttempt?.status === "completed" ? (
          <section className="yandex-mock-result-card">
            <span>Последний результат</span>
            <strong>{currentAttempt.score}<small>/100</small></strong>
            <p>{completedSummary} ответов ты засчитал как правильные.</p>
            <div className="yandex-mock-result-topics">
              {currentAttempt.questions.map((item) => (
                <span className={item.verdict ?? "incorrect"} key={item.id}>
                  {item.verdict === "correct" ? <Check size={15} /> : <X size={15} />}
                  {item.topic}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mock-intro-card">
          <Clock3 size={38} />
          <h2>60 минут без AI и поиска</h2>
          <p>
            Ответы сохраняются в базе. После перезагрузки продолжишь с того же
            вопроса и с оставшимся временем.
          </p>
          <Button
            className="primary-button"
            leftSection={currentAttempt ? <RotateCcw size={17} /> : <Play size={17} />}
            loading={busy === "start"}
            onClick={() => void start()}
          >
            {currentAttempt ? "Начать новую попытку" : "Начать секцию"}
          </Button>
        </section>
        {error ? <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert> : null}
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="page-stack narrow-page yandex-platform-mock-page">
      <header className="mock-session-header">
        <Button
          className="secondary-button"
          leftSection={<ArrowLeft size={17} />}
          type="button"
          variant="default"
          onClick={onBack}
        >
          Выйти
        </Button>
        <span><Clock3 size={17} /> {formatRemaining(remaining)}</span>
      </header>
      <Progress
        color="mint"
        value={(gradedCount / currentAttempt.questions.length) * 100}
      />

      <article className="yandex-platform-question-card">
        <div className="yandex-platform-question-meta">
          <span>{question.topic}</span>
          <small>Фрагмент {questionIndex + 1} из {currentAttempt.questions.length}</small>
        </div>
        <h1>{question.prompt}</h1>
        <pre className="yandex-platform-code"><code>{question.code}</code></pre>

        <Textarea
          disabled={question.expectedAnswer !== null}
          label="Твой прогноз и объяснение"
          minRows={6}
          maxLength={12_000}
          placeholder="Сначала назови результат, затем правило языка…"
          value={draft}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setDrafts((current) => ({
              ...current,
              [question.id]: value,
            }));
          }}
        />

        {question.expectedAnswer !== null ? (
          <section className="yandex-platform-answer">
            <span>Правильный ответ</span>
            <strong>{question.expectedAnswer}</strong>
            <p>{question.explanation}</p>
            <div>
              <Button
                color="red"
                leftSection={<X size={17} />}
                loading={busy === "grade"}
                variant="light"
                onClick={() => void grade("incorrect")}
              >
                Была ошибка
              </Button>
              <Button
                color="mint"
                leftSection={<Check size={17} />}
                loading={busy === "grade"}
                onClick={() => void grade("correct")}
              >
                Ответил верно
              </Button>
            </div>
          </section>
        ) : (
          <Button
            className="primary-button"
            loading={busy === "reveal"}
            onClick={() => void reveal()}
          >
            Зафиксировать и показать ответ
          </Button>
        )}

        {error ? <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert> : null}

        <div className="mock-actions">
          {questionIndex > 0 ? (
            <Button
              className="secondary-button"
              variant="default"
              onClick={() => setQuestionIndex((index) => index - 1)}
            >
              Назад
            </Button>
          ) : null}
          {questionIndex < currentAttempt.questions.length - 1 ? (
            <Button
              className="secondary-button"
              variant="default"
              onClick={() => setQuestionIndex((index) => index + 1)}
            >
              Следующий
            </Button>
          ) : null}
          {allGraded ? (
            <Button
              className="primary-button"
              loading={busy === "complete"}
              onClick={() => void complete()}
            >
              Завершить секцию
            </Button>
          ) : null}
        </div>
      </article>
    </div>
  );
}
