import { Button } from "@mantine/core";
import { ArrowLeft, MessageCircle, RefreshCw } from "lucide-react";

import { AiLessonContent } from "./AiLessonContent";
import { ResourceLinks } from "./ResourceLinks";
import type {
  AiLesson,
  AiLessonQuestionContext,
  LearningResource,
} from "../types";

interface AiLessonReaderProps {
  lesson: AiLesson;
  eyebrow: string;
  title: string;
  description: string;
  resourceIds: string[];
  resources: LearningResource[];
  isRegenerating: boolean;
  onAsk: (context: AiLessonQuestionContext) => void;
  onBack: () => void;
  onOpenChat: () => void;
  onRegenerate: () => void;
}

export function AiLessonReader({
  lesson,
  eyebrow,
  title,
  description,
  resourceIds,
  resources,
  isRegenerating,
  onAsk,
  onBack,
  onOpenChat,
  onRegenerate,
}: AiLessonReaderProps) {
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
          <header className="ai-lesson-reader-heading">
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>

          <AiLessonContent lesson={lesson} onAsk={onAsk} />

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
