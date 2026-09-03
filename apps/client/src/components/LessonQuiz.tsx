import { useMemo, useState } from "react";
import { Button, Progress, Radio } from "@mantine/core";
import { CheckCircle2, RotateCcw, Sparkles, XCircle } from "lucide-react";

import type { AiLesson, LessonQuizAttempt, LessonQuizProgress } from "../types";

type QuizTier = "legacy" | "core" | "deep";

interface LessonQuizProps {
  lesson: AiLesson;
  progress?: LessonQuizProgress;
  onSubmit: (
    tier: QuizTier,
    answers: Array<{ questionId: string; selectedOptionIndex: number }>,
  ) => Promise<LessonQuizProgress | null>;
}

const shuffleQuestionOptions = (lesson: AiLesson, tier: QuizTier) =>
  lesson.quiz
    .filter((question) => question.tier === tier)
    .map((question, questionIndex) => {
      const shift = (questionIndex * 3 + 1) % question.options.length;
      const options = question.options.map((label, sourceIndex) => ({ label, sourceIndex }));
      return {
        ...question,
        options: [...options.slice(shift), ...options.slice(0, shift)],
      };
    });

export function LessonQuiz({ lesson, progress, onSubmit }: LessonQuizProps) {
  const initialTier: QuizTier = lesson.quizVersion === 1 ? "legacy" : "core";
  const [tier, setTier] = useState<QuizTier>(initialTier);
  const questions = useMemo(() => shuffleQuestionOptions(lesson, tier), [lesson, tier]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [completedProgress, setCompletedProgress] = useState<LessonQuizProgress | null>(null);
  const [reviewingAttempt, setReviewingAttempt] = useState<LessonQuizAttempt | null>(null);
  const question = questions[index];
  const selected = question ? answers[question.id] : undefined;
  const activeProgress = completedProgress ?? progress;
  const attempts = activeProgress?.lessonVersion === lesson.version
    ? activeProgress.attempts
    : [];
  const latestAttempt = attempts.filter((attempt) => attempt.tier === tier).at(-1);
  const coreAttempt = attempts.filter((attempt) => attempt.tier === "core").at(-1);
  const deepAttempt = attempts.filter((attempt) => attempt.tier === "deep").at(-1);

  if (questions.length !== 10) {
    return (
      <section className="lesson-quiz lesson-quiz-empty">
        <Sparkles size={25} />
        <div>
          <strong>Проверочный тест появится после обновления статьи</strong>
          <p>Новая версия урока будет содержать Core 10 и Deep 10.</p>
        </div>
      </section>
    );
  }

  const restart = (nextTier = tier) => {
    setTier(nextTier);
    setAnswers({});
    setIndex(0);
    setStarted(true);
    setReviewingAttempt(null);
  };

  const finish = async () => {
    if (Object.keys(answers).length !== questions.length) return;
    setSaving(true);
    const result = await onSubmit(
      tier,
      questions.map((item) => ({
        questionId: item.id,
        selectedOptionIndex: answers[item.id]!,
      })),
    );
    setSaving(false);
    if (result) {
      setCompletedProgress(result);
      setReviewingAttempt(
        result.attempts.filter((attempt) => attempt.tier === tier).at(-1) ?? null,
      );
      setStarted(false);
    }
  };

  if (!started && reviewingAttempt) {
    return (
      <section className="lesson-quiz lesson-quiz-review">
        <div className="lesson-quiz-intro">
          <div>
            <p className="eyebrow">Результат {reviewingAttempt.tier === "deep" ? "Deep" : "Core"}</p>
            <h2>{reviewingAttempt.score}/10</h2>
            <p>Ответы и объяснения открыты только после сохранения попытки.</p>
          </div>
        </div>
        <div className="lesson-quiz-review-list">
          {reviewingAttempt.answers.map((answer, answerIndex) => {
            const sourceQuestion = lesson.quiz.find((item) => item.id === answer.questionId);
            return (
              <article className={answer.correct ? "correct" : "incorrect"} key={answer.questionId}>
                <strong>
                  {answer.correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  {answerIndex + 1}. {sourceQuestion?.prompt}
                </strong>
                {!answer.correct && answer.correctOptionIndex !== undefined ? (
                  <p>Правильный ответ: {sourceQuestion?.options[answer.correctOptionIndex]}</p>
                ) : null}
                {answer.explanation ? <p>{answer.explanation}</p> : null}
              </article>
            );
          })}
        </div>
        <div className="lesson-quiz-actions">
          <Button className="secondary-button" type="button" variant="default" onClick={() => setReviewingAttempt(null)}>Закрыть разбор</Button>
          <Button className="primary-button" leftSection={<RotateCcw size={17} />} type="button" onClick={() => restart()}>Пройти ещё раз</Button>
        </div>
      </section>
    );
  }

  if (!started) {
    return (
      <section className="lesson-quiz lesson-quiz-intro">
        <div>
          <p className="eyebrow">Проверка после чтения</p>
          <h2>{lesson.quizVersion === 2 ? "Core 10 + Deep 10" : "10 вопросов по статье"}</h2>
          <p>Core проверяет основу. Deep — необязательное углубление и перенос знаний.</p>
        </div>
        {lesson.quizVersion === 1 ? (
          <Button className="primary-button" leftSection={latestAttempt ? <RotateCcw size={17} /> : <Sparkles size={17} />} type="button" onClick={() => restart("legacy")}>
            {latestAttempt ? `Пройти ещё раз · ${latestAttempt.score}/10` : "Начать тест"}
          </Button>
        ) : (
          <div className="lesson-quiz-actions">
            <Button className="primary-button" leftSection={coreAttempt ? <RotateCcw size={17} /> : <Sparkles size={17} />} type="button" onClick={() => restart("core")}>
              {coreAttempt ? `Core ещё раз · ${coreAttempt.score}/10` : "Начать Core 10"}
            </Button>
            <Button className="secondary-button" variant="default" type="button" onClick={() => restart("deep")}>
              {deepAttempt ? `Deep ещё раз · ${deepAttempt.score}/10` : "Пройти Deep 10"}
            </Button>
          </div>
        )}
      </section>
    );
  }

  if (!question) return null;

  return (
    <section className="lesson-quiz lesson-quiz-question">
      <div className="lesson-quiz-progress">
        <span>{tier === "deep" ? "Deep" : "Core"} · вопрос {index + 1} из {questions.length}</span>
        <Progress color="brand" value={((index + 1) / questions.length) * 100} />
      </div>
      <span className="lesson-quiz-topic">{question.topic} · {question.capability}</span>
      <h2>{question.prompt}</h2>
      {question.code ? <pre className="lesson-quiz-code"><code>{question.code}</code></pre> : null}
      <Radio.Group
        value={selected === undefined ? null : String(selected)}
        onChange={(value) => {
          if (selected !== undefined) return;
          setAnswers((current) => ({ ...current, [question.id]: Number(value) }));
        }}
      >
        <div className="lesson-quiz-options">
          {question.options.map((option) => (
            <Radio.Card
              key={`${question.id}-${option.sourceIndex}`}
              disabled={selected !== undefined}
              value={String(option.sourceIndex)}
            >
              <Radio.Indicator />
              <span>{option.label}</span>
            </Radio.Card>
          ))}
        </div>
      </Radio.Group>
      <div className="lesson-quiz-actions">
        <Button className="secondary-button" type="button" variant="default" onClick={() => setStarted(false)}>Закрыть</Button>
        {index < questions.length - 1 ? (
          <Button className="primary-button" disabled={selected === undefined} type="button" onClick={() => setIndex((current) => current + 1)}>Следующий вопрос</Button>
        ) : (
          <Button className="primary-button" disabled={selected === undefined} loading={saving} type="button" onClick={() => void finish()}>Проверить ответы</Button>
        )}
      </div>
    </section>
  );
}
