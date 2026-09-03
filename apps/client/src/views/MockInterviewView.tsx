import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Loader, Progress, Textarea } from "@mantine/core";
import { AlertTriangle, ArrowLeft, Clock3, Play, Sparkles } from "lucide-react";

import { AudioAnswerRecorder } from "../components/AudioAnswerRecorder";
import type { BootstrapData, MockInterview } from "../types";

interface MockInterviewViewProps {
  data: BootstrapData;
  onBack: () => void;
  onStart: () => Promise<MockInterview | null>;
  onSaveAnswer: (
    interviewId: string,
    questionId: string,
    content: string,
  ) => Promise<MockInterview | null>;
  onComplete: (interviewId: string) => Promise<MockInterview | null>;
  onTranscribe: (interviewId: string, audio: Blob) => Promise<string | null>;
}

const formatRemaining = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function MockInterviewView({
  data,
  onBack,
  onStart,
  onSaveAnswer,
  onComplete,
  onTranscribe,
}: MockInterviewViewProps) {
  const initialInterview = data.mockInterviews.find((item) => item.status === "in_progress") ?? null;
  const latestCompleted = data.mockInterviews.find((item) => item.status === "completed") ?? null;
  const [interview, setInterview] = useState<MockInterview | null>(initialInterview);
  const [index, setIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>(
    initialInterview?.answers ?? {},
  );
  const [remaining, setRemaining] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const question = interview?.questions[index];
  const answer = question
    ? (draftAnswers[question.id] ?? interview?.answers[question.id] ?? "")
    : "";

  useEffect(() => {
    if (!interview || interview.status !== "in_progress") return;
    const update = () => {
      const elapsed = Math.floor((Date.now() - new Date(interview.startedAt).getTime()) / 1_000);
      setRemaining(Math.max(0, interview.durationMinutes * 60 - elapsed));
    };
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [interview]);

  const answeredCount = useMemo(
    () => interview?.questions.filter((item) => interview.answers[item.id]?.trim()).length ?? 0,
    [interview],
  );

  const start = async () => {
    setError("");
    setSaving(true);
    const started = await onStart();
    setSaving(false);
    if (started) {
      setInterview(started);
      setDraftAnswers(started.answers);
      setIndex(0);
    }
  };

  const saveCurrent = async () => {
    if (!interview || !question || !answer.trim()) return null;
    const updated = await onSaveAnswer(interview.id, question.id, answer.trim());
    if (updated) {
      setInterview(updated);
      setDraftAnswers((current) => ({ ...current, ...updated.answers }));
    }
    return updated;
  };

  const next = async () => {
    setError("");
    if (!answer.trim()) {
      setError("Сначала запиши ответ на текущий вопрос.");
      return;
    }
    setSaving(true);
    const updated = await saveCurrent();
    setSaving(false);
    if (updated) setIndex((current) => Math.min(current + 1, updated.questions.length - 1));
  };

  const complete = async () => {
    setError("");
    if (!answer.trim()) {
      setError("Сначала запиши ответ на текущий вопрос.");
      return;
    }
    setSaving(true);
    const updated = await saveCurrent();
    if (!updated) {
      setSaving(false);
      return;
    }
    const completed = await onComplete(updated.id);
    setSaving(false);
    if (completed) setInterview(completed);
  };

  if (!interview) {
    return (
      <div className="page-stack narrow-page">
        <header className="page-header">
          <div>
            <Button className="secondary-button" leftSection={<ArrowLeft size={17} />} type="button" variant="default" onClick={onBack}>Назад</Button>
            <p className="eyebrow">Тренировка собеседования</p>
            <h1>Мок-интервью на 20 минут</h1>
            <p>Пять вопросов выбираются из слабых категорий. Отвечай текстом так, как говорил бы интервьюеру.</p>
          </div>
        </header>
        <section className="mock-intro-card">
          <Sparkles size={38} />
          <h2>Без подсказок и переключений</h2>
          <p>После завершения AI оценит точность, глубину и ясность каждого ответа.</p>
          <Button className="primary-button" leftSection={<Play size={17} />} loading={saving} type="button" onClick={() => void start()}>
            Начать интервью
          </Button>
          {latestCompleted ? (
            <Button
              className="secondary-button"
              type="button"
              variant="default"
              onClick={() => {
                setInterview(latestCompleted);
                setDraftAnswers(latestCompleted.answers);
              }}
            >
              Последний результат: {latestCompleted.evaluation?.overallScore ?? 0}/100
            </Button>
          ) : null}
        </section>
      </div>
    );
  }

  if (interview.status === "completed" && interview.evaluation) {
    return (
      <div className="page-stack">
        <header className="page-header">
          <div><p className="eyebrow">Результат мок-интервью</p><h1>{interview.evaluation.overallScore} / 100</h1><p>{interview.evaluation.summary}</p></div>
          <Button className="secondary-button" leftSection={<ArrowLeft size={17} />} type="button" variant="default" onClick={() => setInterview(null)}>К новому интервью</Button>
        </header>
        <section className="mock-evaluation-summary">
          <div><strong>Сильные стороны</strong>{(interview.evaluation.strengths ?? []).map((item) => <span key={item}>{item}</span>)}</div>
          <div><strong>Подтянуть</strong>{(interview.evaluation.weakTopics ?? []).map((item) => <span key={item}>{item}</span>)}</div>
        </section>
        <div className="mock-feedback-list">
          {interview.questions.map((item, questionIndex) => {
            const evaluation = interview.evaluation?.questions.find((entry) => entry.questionId === item.id);
            return (
              <article key={item.id}>
                <span>{questionIndex + 1}. {item.category}</span><h2>{item.prompt}</h2>
                <p className="mock-answer">{interview.answers[item.id]}</p>
                <strong>{evaluation?.score ?? 0} / 5</strong><p>{evaluation?.feedback}</p>
                {evaluation?.missingPoints?.length ? <small>Не хватило: {evaluation.missingPoints.join(", ")}</small> : null}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="page-stack narrow-page">
      <header className="mock-session-header">
        <Button className="secondary-button" leftSection={<ArrowLeft size={17} />} type="button" variant="default" onClick={onBack}>Выйти</Button>
        <span><Clock3 size={17} /> {formatRemaining(remaining)}</span>
      </header>
      <Progress value={(answeredCount / interview.questions.length) * 100} color="brand" />
      <article className="mock-question-card">
        <div><span>{question.category}</span><small>Вопрос {index + 1} из {interview.questions.length}</small></div>
        <h1>{question.prompt}</h1>
        <Textarea
          value={answer}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setDraftAnswers((current) => ({
              ...current,
              [question.id]: value,
            }));
          }}
          minRows={10}
          maxLength={12_000}
          placeholder="Структурированный ответ, примеры и компромиссы…"
        />
        <AudioAnswerRecorder
          onTranscribe={(audio) => onTranscribe(interview.id, audio)}
          onTranscript={(text) =>
            setDraftAnswers((current) => ({
              ...current,
              [question.id]: [current[question.id]?.trim(), text].filter(Boolean).join("\n\n"),
            }))
          }
        />
        {error ? <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert> : null}
        <div className="mock-actions">
          {index > 0 ? <Button className="secondary-button" type="button" variant="default" disabled={saving} onClick={() => setIndex((current) => current - 1)}>Назад</Button> : null}
          {index < interview.questions.length - 1 ? (
            <Button className="primary-button" type="button" loading={saving} onClick={() => void next()}>Сохранить и дальше</Button>
          ) : (
            <Button className="primary-button" type="button" loading={saving} leftSection={saving ? <Loader size="xs" /> : <Sparkles size={17} />} onClick={() => void complete()}>Завершить и оценить</Button>
          )}
        </div>
      </article>
    </div>
  );
}
