import { useEffect, useRef } from "react";
import { Alert, Button } from "@mantine/core";
import { AlertTriangle, ArrowLeft, MessageCircle, RefreshCw } from "lucide-react";

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
          </section>
        </div>
      </main>
    </div>
  );
}
