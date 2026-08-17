import { useMemo, useState } from "react";
import { Button, Progress, Radio } from "@mantine/core";
import { CheckCircle2, RotateCcw, Sparkles, XCircle } from "lucide-react";

import type { AiLesson, LessonQuizProgress } from "../types";

interface LessonQuizProps {
  lesson: AiLesson;
  progress?: LessonQuizProgress;
  onSubmit: (
    answers: Array<{ questionId: string; selectedOptionIndex: number }>,
  ) => Promise<LessonQuizProgress | null>;
}

const shuffleQuestionOptions = (lesson: AiLesson) =>
  lesson.quiz.map((question, questionIndex) => {
    const shift = (questionIndex * 3 + 1) % question.options.length;
    const options = question.options.map((label, sourceIndex) => ({ label, sourceIndex }));
    return {
      ...question,
      options: [...options.slice(shift), ...options.slice(0, shift)],
    };
  });

export function LessonQuiz({ lesson, progress, onSubmit }: LessonQuizProps) {
  const questions = useMemo(() => shuffleQuestionOptions(lesson), [lesson]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [completedProgress, setCompletedProgress] = useState<LessonQuizProgress | null>(null);
  const question = questions[index];
  const selected = question ? answers[question.id] : undefined;
  const activeProgress = completedProgress ?? progress;
  const latestAttempt =
    activeProgress?.lessonVersion === lesson.version
      ? activeProgress.attempts.at(-1)
      : undefined;

  if (questions.length !== 10) {
    return (
      <section className="lesson-quiz lesson-quiz-empty">
        <Sparkles size={25} />
        <div><strong>Проверочный тест появится после обновления статьи</strong><p>Новая версия урока будет содержать 10 вопросов с вариантами ответа.</p></div>
      </section>
    );
  }

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setStarted(true);
    setCompletedProgress(null);
  };

  const finish = async () => {
    if (Object.keys(answers).length !== questions.length) return;
    setSaving(true);
    const result = await onSubmit(
      questions.map((item) => ({
        questionId: item.id,
        selectedOptionIndex: answers[item.id]!,
      })),
    );
    setSaving(false);
    if (result) {
      setCompletedProgress(result);
      setStarted(false);
    }
  };

  if (!started) {
    return (
      <section className="lesson-quiz lesson-quiz-intro">
        <div>
          <p className="eyebrow">Проверка после чтения</p>
          <h2>10 вопросов по статье</h2>
          <p>Ответы покажут, что действительно запомнилось, а ошибки попадут в слабые темы.</p>
        </div>
        {latestAttempt ? (
          <div className="lesson-quiz-score">
            <strong>{latestAttempt.score}/10</strong>
            <span>последний результат</span>
          </div>
        ) : null}
        <Button
          className="primary-button"
          leftSection={latestAttempt ? <RotateCcw size={17} /> : <Sparkles size={17} />}
          type="button"
          onClick={restart}
        >
          {latestAttempt ? "Пройти ещё раз" : "Начать тест"}
        </Button>
      </section>
    );
  }

  if (!question) return null;
  const correct = selected === question.correctOptionIndex;

  return (
    <section className="lesson-quiz lesson-quiz-question">
      <div className="lesson-quiz-progress">
        <span>Вопрос {index + 1} из {questions.length}</span>
        <Progress color="mint" value={((index + 1) / questions.length) * 100} />
      </div>
      <span className="lesson-quiz-topic">{question.topic}</span>
      <h2>{question.prompt}</h2>
      <Radio.Group
        value={selected === undefined ? null : String(selected)}
        onChange={(value) => {
          if (selected !== undefined) return;
          setAnswers((current) => ({ ...current, [question.id]: Number(value) }));
        }}
      >
        <div className="lesson-quiz-options">
          {question.options.map((option) => {
            const isCorrect = option.sourceIndex === question.correctOptionIndex;
            const isSelected = option.sourceIndex === selected;
            const stateClass =
              selected === undefined
                ? ""
                : isCorrect
                  ? "correct"
                  : isSelected
                    ? "incorrect"
                    : "muted";
            return (
              <Radio.Card
                key={`${question.id}-${option.sourceIndex}`}
                className={stateClass}
                disabled={selected !== undefined}
                value={String(option.sourceIndex)}
              >
                <Radio.Indicator />
                <span>{option.label}</span>
                {selected !== undefined && isCorrect ? <CheckCircle2 size={18} /> : null}
                {selected !== undefined && isSelected && !isCorrect ? <XCircle size={18} /> : null}
              </Radio.Card>
            );
          })}
        </div>
      </Radio.Group>
      {selected !== undefined ? (
        <div className={correct ? "lesson-quiz-explanation correct" : "lesson-quiz-explanation incorrect"}>
          <strong>{correct ? "Верно" : "Неверно"}</strong>
          <p>{question.explanation}</p>
        </div>
      ) : null}
      <div className="lesson-quiz-actions">
        <Button className="secondary-button" type="button" variant="default" onClick={() => setStarted(false)}>Закрыть</Button>
        {index < questions.length - 1 ? (
          <Button className="primary-button" disabled={selected === undefined} type="button" onClick={() => setIndex((current) => current + 1)}>Следующий вопрос</Button>
        ) : (
          <Button className="primary-button" disabled={selected === undefined} loading={saving} type="button" onClick={() => void finish()}>Сохранить результат</Button>
        )}
      </div>
    </section>
  );
}
