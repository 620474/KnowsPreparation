import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "@mantine/core";
import { Code2, MessageCircle } from "lucide-react";

import { AiLessonDiagram } from "./AiLessonDiagram";
import { CodePlayground } from "./CodePlayground";
import { LessonMarkdown } from "./LessonMarkdown";
import {
  buildPracticeDraftKey,
  markPracticeDraftEdited,
  readPracticeDraft,
  reconcilePracticeDraft,
  reconcilePracticeSaveResult,
  type LocalPracticeDraft,
  writePracticeDraft,
} from "../lib/practice-drafts";
import type {
  TrackKey,
  AiLesson,
  AiLessonQuestionContext,
  PracticeSolutionProgress,
  PracticeSolutionSaveResult,
} from "../types";

interface AiLessonContentProps {
  lesson: AiLesson;
  track: TrackKey;
  practiceProgress?: PracticeSolutionProgress;
  onAsk?: (context: AiLessonQuestionContext) => void;
  onSavePractice: (
    draft: LocalPracticeDraft,
  ) => Promise<PracticeSolutionSaveResult | null>;
}

interface AskButtonProps {
  section: string;
  excerpt: string;
  onAsk?: (context: AiLessonQuestionContext) => void;
}

const formatGeneratedAt = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function AskButton({ section, excerpt, onAsk }: AskButtonProps) {
  if (!onAsk || !excerpt.trim()) return null;

  return (
    <button
      className="ai-lesson-ask"
      type="button"
      onClick={() => onAsk({ section, excerpt })}
    >
      <MessageCircle aria-hidden="true" size={14} />
      Спросить
    </button>
  );
}

export function AiLessonContent({
  lesson,
  track,
  practiceProgress,
  onAsk,
  onSavePractice,
}: AiLessonContentProps) {
  const diagrams = lesson.diagrams ?? [];
  const runner = lesson.practice.runner;
  const practiceKey = buildPracticeDraftKey(
    track,
    lesson.courseVersion,
    lesson.itemId,
    lesson.version,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  const initialPracticeDraft = reconcilePracticeDraft(
    track,
    lesson,
    undefined,
    practiceProgress,
  ).draft;
  const draftRef = useRef(initialPracticeDraft);
  const [practiceDraft, setPracticeDraft] = useState(initialPracticeDraft);
  const [selectedContext, setSelectedContext] = useState<AiLessonQuestionContext | null>(null);

  const setCurrentDraft = useCallback((draft: LocalPracticeDraft) => {
    draftRef.current = draft;
    setPracticeDraft(draft);
    void writePracticeDraft(draft).catch(() => undefined);
  }, []);

  const persistPracticeDraft = useCallback(async (submitted: LocalPracticeDraft) => {
    let pending = submitted;
    while (true) {
      const result = await onSavePractice(pending);
      if (!result) return;
      const reconciled = reconcilePracticeSaveResult(
        draftRef.current,
        pending,
        result,
      );
      setCurrentDraft(reconciled.draft);
      if (!reconciled.shouldSync) return;
      pending = reconciled.draft;
    }
  }, [onSavePractice, setCurrentDraft]);

  const schedulePracticeSave = useCallback((draft: LocalPracticeDraft, delay = 700) => {
    window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      void persistPracticeDraft(draft);
    }, delay);
  }, [persistPracticeDraft]);

  useEffect(() => {
    let cancelled = false;
    window.clearTimeout(saveTimeoutRef.current);
    const fallback = reconcilePracticeDraft(
      track,
      lesson,
      undefined,
      practiceProgress,
    ).draft;
    draftRef.current = fallback;
    void readPracticeDraft(practiceKey).catch(() => undefined).then((local) => {
      if (cancelled) return;
      const reconciled = reconcilePracticeDraft(
        track,
        lesson,
        local,
        practiceProgress,
      );
      setCurrentDraft(reconciled.draft);
      if (reconciled.shouldSync) schedulePracticeSave(reconciled.draft, 0);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(saveTimeoutRef.current);
    };
  }, [lesson, practiceKey, practiceProgress, schedulePracticeSave, track, setCurrentDraft]);

  useEffect(() => {
    if (!onAsk) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() ?? "";
      const anchorNode = selection?.anchorNode;
      const root = rootRef.current;
      if (!selectedText || !anchorNode || !root) {
        setSelectedContext(null);
        return;
      }

      if (!root.contains(anchorNode)) {
        setSelectedContext(null);
        return;
      }

      const anchorElement =
        anchorNode.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as Element)
          : anchorNode.parentElement;
      const section =
        anchorElement?.closest<HTMLElement>("[data-ai-section]")?.dataset.aiSection ??
        "Материал урока";
      setSelectedContext({ section, excerpt: selectedText });
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, [onAsk]);

  return (
    <div className="ai-lesson" ref={rootRef}>
      <div className="ai-lesson-version">
        Урок v{lesson.version} · {formatGeneratedAt(lesson.generatedAt)}
      </div>

      <section data-ai-section="Цели урока">
        <div className="ai-lesson-section-heading">
          <h3>Что нужно уметь после урока</h3>
          <AskButton section="Цели урока" excerpt={lesson.goals.join("\n")} onAsk={onAsk} />
        </div>
        <ul>{lesson.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
      </section>

      <section data-ai-section="Объяснение">
        <div className="ai-lesson-section-heading">
          <h3>Объяснение</h3>
          <AskButton section="Объяснение" excerpt={lesson.explanation} onAsk={onAsk} />
        </div>
        <LessonMarkdown className="ai-lesson-explanation" content={lesson.explanation} />
      </section>

      {diagrams.length > 0 ? (
        <section className="ai-lesson-diagrams" data-ai-section="Интерактивные схемы">
          <h3>Интерактивные схемы</h3>
          <div className="ai-diagram-list">
            {diagrams.map((diagram, index) => (
              <AiLessonDiagram
                diagram={diagram}
                key={`${diagram.title}-${index}`}
                onAsk={onAsk}
              />
            ))}
          </div>
        </section>
      ) : null}

      {lesson.codeExamples.length > 0 ? (
        <section data-ai-section="Примеры кода">
          <div className="ai-lesson-section-heading">
            <h3><Code2 size={18} /> Примеры кода</h3>
            <AskButton
              section="Примеры кода"
              excerpt={lesson.codeExamples
                .map((example) => `${example.title}\n${example.code}\n${example.explanation}`)
                .join("\n\n")}
              onAsk={onAsk}
            />
          </div>
          <div className="ai-code-list">
            {lesson.codeExamples.map((example) => (
              <article key={`${example.title}-${example.code}`}>
                <strong>{example.title}</strong>
                <pre><code>{example.code}</code></pre>
                <p>{example.explanation}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="ai-lesson-columns">
        <section data-ai-section="Частые ошибки">
          <div className="ai-lesson-section-heading">
            <h3>Частые ошибки</h3>
            <AskButton
              section="Частые ошибки"
              excerpt={lesson.commonMistakes.join("\n")}
              onAsk={onAsk}
            />
          </div>
          <ul>{lesson.commonMistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul>
        </section>
        <section data-ai-section="Вопросы на собеседовании">
          <div className="ai-lesson-section-heading">
            <h3>Вопросы на собеседовании</h3>
            <AskButton
              section="Вопросы на собеседовании"
              excerpt={lesson.interviewQuestions.join("\n")}
              onAsk={onAsk}
            />
          </div>
          <ol>{lesson.interviewQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
        </section>
      </div>

      <section className="ai-practice" data-ai-section="Практика">
        <div className="ai-lesson-section-heading">
          <span>Практика без готового решения</span>
          <AskButton section="Практика" excerpt={lesson.practice.statement} onAsk={onAsk} />
        </div>
        <h3>{lesson.practice.title}</h3>
        <p>{lesson.practice.statement}</p>
        {lesson.practice.constraints.length > 0 ? (
          <ul>{lesson.practice.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
        ) : null}
        {lesson.practice.examples.map((example) => (
          <div className="ai-practice-example" key={`${example.input}-${example.output}`}>
            <code>Ввод: {example.input}</code>
            <code>Вывод: {example.output}</code>
            <p>{example.explanation}</p>
          </div>
        ))}
        {runner ? (
          <div className="ai-practice-runner">
            <Textarea
              aria-label={`Решение: ${lesson.practice.title}`}
              className="task-solution"
              label="Решение"
              minRows={10}
              value={practiceDraft.solution}
              onChange={(event) => {
                const next = markPracticeDraftEdited(
                  draftRef.current,
                  event.currentTarget.value,
                );
                setCurrentDraft(next);
                schedulePracticeSave(next);
              }}
            />
            <div className="ai-practice-sync-status">
              {practiceDraft.dirty
                ? "Сохранено локально · ожидает синхронизации"
                : practiceDraft.revision > 0
                  ? `Синхронизировано · версия ${practiceDraft.revision}`
                  : "Локальный черновик"}
            </div>
            {practiceDraft.conflictSolution !== undefined ? (
              <div className="ai-practice-conflict" role="alert">
                <span>
                  На сервере была более новая версия. Локальный вариант сохранён отдельно.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const restored = markPracticeDraftEdited(
                      {
                        ...draftRef.current,
                        conflictSolution: undefined,
                        conflictUpdatedAt: undefined,
                      },
                      draftRef.current.conflictSolution ?? "",
                    );
                    setCurrentDraft(restored);
                    schedulePracticeSave(restored, 0);
                  }}
                >
                  Восстановить локальный черновик
                </button>
              </div>
            ) : null}
            <CodePlayground
              attemptTarget={{
                track,
                itemId: lesson.itemId,
                source: "lesson",
                lessonVersion: lesson.version,
              }}
              code={practiceDraft.solution}
              runner={runner}
            />
          </div>
        ) : null}
      </section>

      <section className="ai-lesson-summary" data-ai-section="Короткий итог">
        <div className="ai-lesson-section-heading">
          <h3>Короткий итог</h3>
          <AskButton section="Короткий итог" excerpt={lesson.summary} onAsk={onAsk} />
        </div>
        <LessonMarkdown content={lesson.summary} />
      </section>

      {selectedContext && onAsk ? (
        <button
          className="ai-selection-ask"
          type="button"
          onClick={() => {
            onAsk(selectedContext);
            setSelectedContext(null);
          }}
        >
          <MessageCircle aria-hidden="true" size={17} />
          Спросить про выделенное
        </button>
      ) : null}
    </div>
  );
}
