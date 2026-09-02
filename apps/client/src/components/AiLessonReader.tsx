import { useEffect, useRef } from "react";
import { Alert, Badge, Button } from "@mantine/core";
import {
  AlertTriangle,
  ArrowLeft,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

import { AiLessonContent } from "./AiLessonContent";
import { LessonQuiz } from "./LessonQuiz";
import { ResourceLinks } from "./ResourceLinks";
import type {
  TrackKey,
  AiLesson,
  AiLessonQuestionContext,
  LearningResource,
  LessonQuizProgress,
  PracticeSolutionProgress,
  PracticeSolutionSaveResult,
} from "../types";
import type { LocalPracticeDraft } from "../lib/practice-drafts";

const sourceIssueLocationLabels = {
  explanation: "Текст урока",
  code_example: "Пример кода",
  diagram: "Схема",
  practice: "Практика",
  quiz: "Квиз",
  summary: "Итоги",
} as const;

interface AiLessonReaderProps {
  lesson: AiLesson;
  track: TrackKey;
  eyebrow: string;
  title: string;
  description: string;
  resourceIds: string[];
  resources: LearningResource[];
  isRegenerating: boolean;
  focusQuiz?: boolean;
  /** Читалка перекрывает страницу целиком, поэтому ошибку показываем внутри неё. */
  error?: string;
  onDismissError?: () => void;
  quizProgress?: LessonQuizProgress;
  practiceProgress?: PracticeSolutionProgress;
  onAsk: (context: AiLessonQuestionContext) => void;
  onBack: () => void;
  onOpenChat: () => void;
  onRegenerate: () => void;
  onSavePractice: (
    draft: LocalPracticeDraft,
  ) => Promise<PracticeSolutionSaveResult | null>;
  onSubmitQuiz: (
    tier: "legacy" | "core" | "deep",
    answers: Array<{ questionId: string; selectedOptionIndex: number }>,
  ) => Promise<LessonQuizProgress | null>;
}

export function AiLessonReader({
  lesson,
  track,
  eyebrow,
  title,
  description,
  resourceIds,
  resources,
  isRegenerating,
  focusQuiz = false,
  error,
  onDismissError,
  quizProgress,
  practiceProgress,
  onAsk,
  onBack,
  onOpenChat,
  onRegenerate,
  onSavePractice,
  onSubmitQuiz,
}: AiLessonReaderProps) {
  const quizRef = useRef<HTMLDivElement>(null);
  const sourceIssues = lesson.sourceVerificationIssues ?? [];
  const criticalSourceIssues = sourceIssues.filter((issue) => issue.severity === "critical");
  const sourceWarnings = sourceIssues.filter((issue) => issue.severity === "warning");

  useEffect(() => {
    if (!focusQuiz) return;
    const animationFrame = window.requestAnimationFrame(() => {
      quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [focusQuiz, lesson.version]);

  return (
    <div aria-label={`Урок: ${title}`} aria-modal="true" className="ai-lesson-reader" role="dialog">
      <header className="ai-lesson-reader-toolbar">
        <Button
          className="secondary-button"
          leftSection={<ArrowLeft size={18} />}
          type="button"
          variant="default"
          onClick={onBack}
        >
          Назад
        </Button>
        <div className="ai-lesson-reader-toolbar-copy">
          <span>{eyebrow}</span>
          <strong>{title}</strong>
        </div>
        <div className="ai-lesson-reader-actions">
          <Button
            className="secondary-button"
            leftSection={<RefreshCw size={17} />}
            loading={isRegenerating}
            type="button"
            variant="default"
            onClick={onRegenerate}
          >
            Обновить
          </Button>
          <Button
            className="primary-button"
            leftSection={<MessageCircle size={17} />}
            type="button"
            onClick={onOpenChat}
          >
            Обсудить
          </Button>
        </div>
      </header>

      <main className="ai-lesson-reader-scroll">
        <div className="ai-lesson-reader-content">
          {error ? (
            <Alert
              className="ai-lesson-reader-error"
              color="red"
              icon={<AlertTriangle size={17} />}
              variant="light"
              withCloseButton
              closeButtonLabel="Закрыть сообщение"
              onClose={onDismissError}
            >
              {error}
            </Alert>
          ) : null}

          <header className="ai-lesson-reader-heading">
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
            {lesson.reviewStatus && lesson.reviewModel ? (
              <div className="ai-lesson-review-meta">
                <Badge
                  color="green"
                  leftSection={<ShieldCheck aria-hidden="true" size={14} />}
                  radius="xl"
                  size="lg"
                  variant="light"
                >
                  Проверено {lesson.reviewModel}
                  {lesson.reviewScore === undefined ? "" : ` · ${lesson.reviewScore}/100`}
                </Badge>
                {lesson.reviewStatus === "revised" ? (
                  <span>
                    Terra исправила замечания: {lesson.reviewIssues?.length ?? 0}
                  </span>
                ) : null}
              </div>
            ) : null}
            {lesson.sourceVerificationStatus ? (
              <div className="ai-lesson-source-verification">
                <Badge
                  color={criticalSourceIssues.length
                    ? "red"
                    : lesson.sourceVerificationStatus === "verified"
                      ? "green"
                      : "yellow"}
                  radius="xl"
                  size="lg"
                  variant="light"
                >
                  {criticalSourceIssues.length
                    ? "Найдена критическая ошибка"
                    : lesson.sourceVerificationStatus === "verified"
                      ? sourceWarnings.length
                        ? `Проверено · уточнений: ${sourceWarnings.length}`
                        : "Факты сверены"
                      : "Источники сверены частично"}
                  {lesson.sourceVerificationScore === undefined
                    ? ""
                    : ` · ${lesson.sourceVerificationScore}/100`}
                </Badge>
                {criticalSourceIssues.map((issue, index) => (
                  <p key={`${issue.claim}-${index}`}>
                    <strong>{issue.claim}:</strong> {issue.message}
                  </p>
                ))}
                {sourceWarnings.length ? (
                  <details className="ai-lesson-source-details">
                    <summary>Показать уточнения проверки</summary>
                    {sourceWarnings.map((issue, index) => (
                      <article key={`${issue.claim}-${index}`}>
                        <small>
                          {issue.location
                            ? sourceIssueLocationLabels[issue.location]
                            : "Сохранённое замечание"}
                        </small>
                        <strong>{issue.claim}</strong>
                        <p>{issue.message}</p>
                        {issue.excerpt ? <blockquote>{issue.excerpt}</blockquote> : null}
                      </article>
                    ))}
                  </details>
                ) : null}
              </div>
            ) : null}
          </header>

          <AiLessonContent
            lesson={lesson}
            practiceProgress={practiceProgress}
            track={track}
            onAsk={onAsk}
            onSavePractice={onSavePractice}
          />

          <div className="ai-lesson-quiz-anchor" ref={quizRef}>
            <LessonQuiz lesson={lesson} progress={quizProgress} onSubmit={onSubmitQuiz} />
          </div>

          <section className="ai-lesson-reader-sources">
            <strong>Дополнительные источники</strong>
            <ResourceLinks resourceIds={resourceIds} resources={resources} />
            {resourceIds.length === 0 ? <p>Для темы пока нет точных ссылок в каталоге.</p> : null}
            {lesson.verifiedSources?.length ? (
              <div className="ai-lesson-verified-sources">
                <strong>Источники проверки</strong>
                {lesson.verifiedSources.map((source) => (
                  <a href={source.url} key={source.url} rel="noreferrer" target="_blank">
                    <ExternalLink size={15} />
                    {source.title}
                  </a>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
