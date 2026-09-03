import { useRef, useState } from "react";
import { Button, Progress, Slider, Textarea } from "@mantine/core";
import { ArrowLeft, Brain, CheckCircle2, CircleAlert, Clock3, Play } from "lucide-react";

import { CodeEditor } from "../components/CodeEditor";
import { buildReviewQueue } from "../lib/review-queue";
import type { BootstrapData, QuestionAttemptResult } from "../types";

interface QuestionAttemptInput {
  questionId: string;
  answer: string;
  explanation?: string;
  selectedOptionIndex?: number;
  confidence: number;
  responseTimeMs: number;
}

interface ReviewViewProps {
  data: BootstrapData;
  onBack: () => void;
  onSubmitAttempt: (input: QuestionAttemptInput) => Promise<QuestionAttemptResult | null>;
}

const exerciseLabels = {
  predict_output: "Предсказать результат",
  multiple_choice: "Выбрать и объяснить",
  bug_fix: "Найти и исправить",
  live_coding: "Live coding",
  explain: "Объяснить решение",
} as const;

const currentTimestamp = () => Date.now();

const selectSessionQueue = <T extends { question: { exercise?: { expectedSeconds: number } } }>(
  queue: T[],
  minutes: number,
) => {
  const budgetSeconds = minutes * 60;
  let scheduledSeconds = 0;
  const selected: T[] = [];
  for (const item of queue) {
    const duration = item.question.exercise?.expectedSeconds ?? 180;
    if (selected.length > 0 && scheduledSeconds + duration > budgetSeconds) break;
    selected.push(item);
    scheduledSeconds += duration;
  }
  return selected;
};

export function ReviewView({ data, onBack, onSubmitAttempt }: ReviewViewProps) {
  const [availableQueue] = useState(() =>
    buildReviewQueue(data.questions, data.progress.questions)
      .filter((entry) => Boolean(entry.question.exercise)),
  );
  const [sessionMinutes, setSessionMinutes] = useState<5 | 10 | null>(null);
  const queue = sessionMinutes ? selectSessionQueue(availableQueue, sessionMinutes) : [];
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(
    () => availableQueue[0]?.question.exercise?.starterCode ?? "",
  );
  const [explanation, setExplanation] = useState("");
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(70);
  const startedAtRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [result, setResult] = useState<QuestionAttemptResult | null>(null);
  const item = queue[index];
  const exercise = item?.question.exercise;

  const startSession = (minutes: 5 | 10) => {
    startedAtRef.current = currentTimestamp();
    setSessionMinutes(minutes);
  };

  if (sessionMinutes === null) {
    return (
      <div className="page-stack narrow-page">
        <header className="page-header review-header">
          <Button className="secondary-button" leftSection={<ArrowLeft size={17} />} type="button" variant="default" onClick={onBack}>
            Назад
          </Button>
          <div><p className="eyebrow">Interview Gym</p><h1>Докажи навык</h1></div>
        </header>
        <section className="review-complete-card evidence-session-start">
          <Brain size={42} />
          <p className="eyebrow">Не самооценка, а проверка</p>
          <h1>Сколько времени есть?</h1>
          <p>Получишь конкретные задачи с кодом, автоматической проверкой и разбором ошибок.</p>
          <div className="evidence-session-options">
            <Button className="secondary-button" leftSection={<Clock3 size={18} />} variant="default" onClick={() => startSession(5)}>
              Быстрые 5 минут
            </Button>
            <Button className="primary-button" leftSection={<Play size={18} />} onClick={() => startSession(10)}>
              Спринт 10 минут
            </Button>
          </div>
          <small>Доступно проверяемых заданий: {availableQueue.length}</small>
        </section>
      </div>
    );
  }

  const advance = () => {
    const nextIndex = index + 1;
    const nextExercise = queue[nextIndex]?.question.exercise;
    setAnswer(nextExercise?.starterCode ?? "");
    setExplanation("");
    setSelectedOptionIndex(null);
    setConfidence(70);
    startedAtRef.current = currentTimestamp();
    setValidationError("");
    setResult(null);
    setIndex(nextIndex);
  };

  if (!item || !exercise) {
    return (
      <div className="page-stack narrow-page">
        <section className="review-complete-card">
          <CheckCircle2 size={42} />
          <p className="eyebrow">Тренировка завершена</p>
          <h1>На сегодня всё</h1>
          <p>Новые проверяемые задачи появятся автоматически по расписанию.</p>
          <Button className="primary-button" type="button" onClick={onBack}>
            Вернуться в базу знаний
          </Button>
        </section>
      </div>
    );
  }

  const submit = async () => {
    if (exercise.type === "multiple_choice" && selectedOptionIndex === null) {
      setValidationError("Сначала выбери вариант ответа.");
      return;
    }
    if (exercise.type !== "multiple_choice" && !answer.trim()) {
      setValidationError("Сначала дай ответ.");
      return;
    }
    if (exercise.requiresExplanation && exercise.type !== "explain" && !explanation.trim()) {
      setValidationError("Добавь короткое объяснение — на интервью важен ход мысли.");
      return;
    }
    setValidationError("");
    setSaving(true);
    const checked = await onSubmitAttempt({
      questionId: item.question.id,
      answer: exercise.type === "multiple_choice"
        ? exercise.choices?.[selectedOptionIndex ?? -1] ?? ""
        : answer.trim(),
      ...(explanation.trim() ? { explanation: explanation.trim() } : {}),
      ...(selectedOptionIndex === null ? {} : { selectedOptionIndex }),
      confidence,
      responseTimeMs: Math.max(0, currentTimestamp() - startedAtRef.current),
    });
    setSaving(false);
    if (checked) setResult(checked);
    else if (!navigator.onLine) advance();
  };

  return (
    <div className="page-stack narrow-page evidence-training-page">
      <header className="page-header review-header">
        <Button className="secondary-button" leftSection={<ArrowLeft size={17} />} type="button" variant="default" onClick={onBack}>
          Назад
        </Button>
        <div>
          <p className="eyebrow">Тренировка навыка · {exerciseLabels[exercise.type]}</p>
          <h1>{index + 1} из {queue.length}</h1>
        </div>
      </header>
      <Progress value={(index / queue.length) * 100} color="brand" size="sm" />

      <article className="review-question-card evidence-question-card">
        <div className="review-question-meta">
          <span><Brain size={16} /> {item.question.category}</span>
          <span>{Math.ceil(exercise.expectedSeconds / 60)} мин · {item.isNew ? "Новая вариация" : `Интервал ${item.progress.intervalDays} дн.`}</span>
        </div>
        <div className="evidence-question-copy">
          <p className="eyebrow">Задача</p>
          <h2>{item.question.prompt}</h2>
          <p>{exercise.instructions}</p>
        </div>

        {exercise.code ? <pre className="evidence-code"><code>{exercise.code}</code></pre> : null}

        {!result && exercise.type === "multiple_choice" ? (
          <div className="evidence-choice-list">
            {exercise.choices?.map((option, optionIndex) => (
              <Button
                key={option}
                className={selectedOptionIndex === optionIndex ? "evidence-choice selected" : "evidence-choice"}
                type="button"
                variant="default"
                onClick={() => setSelectedOptionIndex(optionIndex)}
              >
                <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
              </Button>
            ))}
          </div>
        ) : null}

        {!result && (exercise.type === "bug_fix" || exercise.type === "live_coding") ? (
          <CodeEditor value={answer} label="Твоё решение" minHeight={280} onChange={setAnswer} onRun={() => void submit()} />
        ) : null}

        {!result && exercise.type !== "multiple_choice" && exercise.type !== "bug_fix" && exercise.type !== "live_coding" ? (
          <Textarea
            value={answer}
            label={exercise.type === "predict_output" ? "Твой прогноз" : "Твой ответ"}
            minRows={exercise.type === "explain" ? 7 : 3}
            placeholder={exercise.answerPlaceholder}
            onChange={(event) => setAnswer(event.currentTarget.value)}
          />
        ) : null}

        {!result && exercise.requiresExplanation && exercise.type !== "explain" ? (
          <Textarea value={explanation} label="Почему именно так?" minRows={3} placeholder="Назови механизм, а не только результат" onChange={(event) => setExplanation(event.currentTarget.value)} />
        ) : null}

        {!result ? (
          <div className="evidence-confidence">
            <div><strong>Уверенность до проверки</strong><span>{confidence}%</span></div>
            <Slider value={confidence} min={0} max={100} step={10} onChange={setConfidence} />
            <small>Это измеряет калибровку, но не влияет на правильность.</small>
          </div>
        ) : null}

        {validationError ? <p className="form-error"><CircleAlert size={17} /> {validationError}</p> : null}

        {!result ? (
          <Button className="primary-button evidence-submit" leftSection={<Play size={18} />} loading={saving} type="button" onClick={() => void submit()}>
            Проверить ответ
          </Button>
        ) : (
          <section className={result.passed ? "evidence-result passed" : "evidence-result failed"}>
            <p className="eyebrow">{result.passed ? "Проверка пройдена" : "Нужно повторить"}</p>
            <h2>{result.score}/100</h2>
            <p>Калибровка: уверенность {result.confidence}%, отклонение {Math.abs(result.calibrationGap)} п.п.</p>
            <div className="evidence-answer-comparison">
              <div className="evidence-answer-block submitted">
                <strong>Твой ответ:</strong>
                <pre><code>{result.submittedAnswer}</code></pre>
                {result.submittedExplanation ? (
                  <div className="evidence-answer-explanation">
                    <strong>Твоё объяснение:</strong>
                    <p>{result.submittedExplanation}</p>
                  </div>
                ) : null}
              </div>
              {result.expectedAnswer ? (
                <div className="evidence-answer-block expected">
                  <strong>Эталон:</strong>
                  <pre><code>{result.expectedAnswer}</code></pre>
                </div>
              ) : null}
            </div>
            <ul>{result.feedback.map((message) => <li key={message}>{message}</li>)}</ul>
            <Button className="primary-button" type="button" onClick={advance}>
              Следующая задача
            </Button>
          </section>
        )}
      </article>
    </div>
  );
}
