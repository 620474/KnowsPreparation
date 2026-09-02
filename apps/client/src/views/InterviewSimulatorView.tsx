import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Loader, Progress, SegmentedControl, Select, Textarea } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  BriefcaseBusiness,
  Check,
  Clock3,
  Code2,
  MessageSquareText,
  Play,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { learningApi } from "../api";
import { AudioAnswerRecorder } from "../components/AudioAnswerRecorder";
import { CodeEditor } from "../components/CodeEditor";
import type {
  InterviewExercise,
  InterviewSession,
  InterviewSessionCompany,
  InterviewSessionKind,
  InterviewSessionMode,
} from "../types";

const CURRENT_QUERY_KEY = ["interview-sessions", "current"] as const;
const HISTORY_QUERY_KEY = ["interview-sessions", "history"] as const;

const modeOptions = [
  { value: "express", label: "Экспресс" },
  { value: "full", label: "Полное" },
];

const kindOptions = [
  { value: "training", label: "Тренировка" },
  { value: "exam", label: "Экзамен без AI" },
];

const companyOptions = [
  { value: "general", label: "Общий бигтех" },
  { value: "yandex", label: "Яндекс" },
  { value: "ozon", label: "Ozon" },
];

const stageLabels = {
  platform: "Платформа",
  coding: "Live coding",
  ai: "Задача с AI",
  defense: "Защита",
  completed: "Результат",
} as const;

const sectionLabels = {
  platform: "Платформа",
  coding: "Live coding",
  ai: "Работа с AI",
  communication: "Коммуникация",
} as const;

const confidenceLabels = {
  low: "Предварительная оценка",
  medium: "Средняя уверенность",
  high: "Высокая уверенность",
} as const;

const formatRemaining = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

function ExerciseResult({ exercise }: { exercise: InterviewExercise }) {
  if (!exercise.result) return null;
  return (
    <div className="interview-test-results">
      <strong>
        Серверная проверка: {exercise.result.passedCount}/{exercise.result.totalCount}
      </strong>
      {exercise.result.error ? <small>{exercise.result.error}</small> : null}
      {exercise.result.tests.map((test) => (
        <span className={test.passed ? "passed" : "failed"} key={test.title}>
          {test.passed ? <Check size={15} /> : <X size={15} />}
          {test.title}
        </span>
      ))}
    </div>
  );
}

export function InterviewSimulatorView() {
  const queryClient = useQueryClient();
  const currentQuery = useQuery({
    queryKey: CURRENT_QUERY_KEY,
    queryFn: learningApi.getCurrentInterviewSession,
    refetchOnWindowFocus: true,
  });
  const historyQuery = useQuery({
    queryKey: HISTORY_QUERY_KEY,
    queryFn: () => learningApi.listInterviewSessions(10),
  });
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);
  const [mode, setMode] = useState<InterviewSessionMode>("express");
  const [kind, setKind] = useState<InterviewSessionKind>("training");
  const [company, setCompany] = useState<InterviewSessionCompany>("yandex");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [platformDrafts, setPlatformDrafts] = useState<
    Record<string, { answer: string; followUpAnswer: string; secondFollowUpAnswer: string }>
  >({});
  const [codingDraft, setCodingDraft] = useState<{ sessionId: string; value: string } | null>(null);
  const [aiCodeDraft, setAiCodeDraft] = useState<{ sessionId: string; value: string } | null>(null);
  const [aiDraft, setAiDraft] = useState("");
  const [streamedReply, setStreamedReply] = useState("");
  const [defenseDrafts, setDefenseDrafts] = useState<Record<number, string>>({});

  const session = selectedSession ?? currentQuery.data ?? null;
  const codingSolution = session && codingDraft?.sessionId === session.id
    ? codingDraft.value
    : session?.codingExercise.solution ?? "";
  const aiSolution = session && aiCodeDraft?.sessionId === session.id
    ? aiCodeDraft.value
    : session?.aiExercise.solution ?? "";

  useEffect(() => {
    if (!session || session.status === "completed") return;
    const update = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.startedAt).getTime()) / 1_000,
      );
      setRemaining(Math.max(0, session.durationMinutes * 60 - elapsed));
    };
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [session]);

  const applySession = (next: InterviewSession) => {
    setSelectedSession(next);
    queryClient.setQueryData(CURRENT_QUERY_KEY, next.status === "completed" ? null : next);
  };

  const run = async (key: string, action: () => Promise<InterviewSession>) => {
    setBusy(key);
    setError("");
    try {
      const next = await action();
      applySession(next);
      if (next.status === "completed") {
        void queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
      }
      return next;
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Не удалось продолжить интервью",
      );
      return null;
    } finally {
      setBusy("");
    }
  };

  const activePlatformItem = useMemo(
    () =>
      session?.platformItems.find((item) => !item.completed) ??
      session?.platformItems.at(-1),
    [session],
  );
  const activePlatformDraft = activePlatformItem
    ? platformDrafts[activePlatformItem.question.id] ?? {
        answer: activePlatformItem.answer,
        followUpAnswer: activePlatformItem.followUpAnswer,
        secondFollowUpAnswer: activePlatformItem.secondFollowUpAnswer ?? "",
      }
    : null;
  const defenseIndex = useMemo(
    () => session?.defenseAnswers.findIndex((answer) => !answer.trim()) ?? -1,
    [session],
  );

  if (currentQuery.isPending && !session) {
    return <div className="view-loader"><Loader color="mint" /> Восстанавливаю интервью…</div>;
  }

  if (!session) {
    return (
      <div className="page-stack interview-page">
        <header className="interview-hero">
          <div>
            <p className="eyebrow">Версия 4.0 · Interview Simulator</p>
            <h1>Собеседование, которое измеряет готовность</h1>
            <p>
              Платформа, live coding, задача с AI и защита решения — в одной
              сессии с сохранением результата.
            </p>
          </div>
          <BriefcaseBusiness size={58} />
        </header>

        <section className="interview-setup-card">
          <div>
            <h2>Новая сессия</h2>
            <p>Выбери формат и профиль. Активная сессия восстановится после перезагрузки.</p>
          </div>
          <Select
            data={modeOptions}
            label="Формат"
            value={mode}
            onChange={(value) => value && setMode(value as InterviewSessionMode)}
          />
          <Select
            data={companyOptions}
            label="Профиль"
            value={company}
            onChange={(value) => value && setCompany(value as InterviewSessionCompany)}
          />
          <div>
            <span className="interview-kind-label">Режим</span>
            <SegmentedControl
              data={kindOptions}
              fullWidth
              value={kind}
              onChange={(value) => setKind(value as InterviewSessionKind)}
            />
            <small className="interview-kind-hint">
              {kind === "exam"
                ? `${mode === "full" ? 90 : 60} минут, AI и подсказки скрыты до итоговой оценки.`
                : `${mode === "full" ? 75 : 35} минут с отдельной секцией работы с AI.`}
            </small>
          </div>
          <Button
            className="primary-button"
            leftSection={<Play size={17} />}
            loading={busy === "start"}
            onClick={() => void run("start", () => learningApi.startInterviewSession(mode, company, kind))}
          >
            Начать интервью
          </Button>
        </section>

        {error ? <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert> : null}

        {historyQuery.data?.length ? (
          <section className="interview-history">
            <div className="section-heading"><div><p className="eyebrow">История</p><h2>Последние сессии</h2></div></div>
            <div>
              {historyQuery.data.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedSession(item)}>
                  <span>{formatDate(item.completedAt ?? item.startedAt)}</span>
                  <strong>{item.evaluation?.overallScore ?? 0}/100</strong>
                  <small>
                    {companyOptions.find((option) => option.value === item.company)?.label}
                    {item.kind === "exam" ? " · Экзамен" : " · Тренировка"}
                  </small>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (session.status === "completed" && session.evaluation) {
    const evaluation = session.evaluation;
    return (
      <div className="page-stack interview-page">
        <header className="interview-result-hero">
          <div>
            <p className="eyebrow">Готовность · {confidenceLabels[evaluation.readinessConfidence]}</p>
            <h1>{evaluation.overallScore}<span>/100</span></h1>
            <p>{evaluation.summary}</p>
          </div>
          <ShieldCheck size={62} />
        </header>
        <section className="interview-score-grid">
          {Object.entries(evaluation.sections).map(([key, section]) => (
            <article key={key}>
              <span>{sectionLabels[key as keyof typeof sectionLabels]}</span>
              <strong>{section.assessed === false ? "—" : section.score}</strong>
              <Progress color={section.assessed === false ? "gray" : "mint"} value={section.assessed === false ? 0 : section.score} />
              <p>{section.feedback}</p>
            </article>
          ))}
        </section>
        <section className="interview-result-columns">
          <div><h2>Сильные стороны</h2>{evaluation.strengths.map((item) => <span key={item}>{item}</span>)}</div>
          <div><h2>Слабые темы</h2>{evaluation.weakTopics.map((item) => <span key={item}>{item}</span>)}</div>
          <div><h2>Следующие шаги</h2>{evaluation.recommendations.map((item) => <span key={item}>{item}</span>)}</div>
        </section>
        <Button className="primary-button interview-new-button" onClick={() => setSelectedSession(null)}>
          Новая сессия
        </Button>
      </div>
    );
  }

  const stages = session.kind === "exam"
    ? ["platform", "coding", "defense"]
    : ["platform", "coding", "ai", "defense"];
  const stageIndex = stages.indexOf(
    session.currentStage,
  );

  return (
    <div className="page-stack interview-page">
      <header className="interview-session-header">
        <div>
          <p className="eyebrow">
            {session.kind === "exam" ? "Экзамен · " : ""}{stageLabels[session.currentStage]}
          </p>
          <h1>{companyOptions.find((option) => option.value === session.company)?.label}</h1>
        </div>
        <span><Clock3 size={17} /> {formatRemaining(remaining)}</span>
      </header>
      <Progress color="mint" value={Math.max(8, ((stageIndex + 1) / stages.length) * 100)} />
      {error ? <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert> : null}

      {session.currentStage === "platform" && activePlatformItem ? (
        <section className="interview-stage-card">
          <div className="interview-platform-progress">
            Вопрос {session.platformItems.filter((item) => item.completed).length + 1}
            {session.platformQuestionTarget ? ` из ${session.platformQuestionTarget}` : ""}
          </div>
          <div className="interview-stage-heading">
            <MessageSquareText />
            <div><span>{activePlatformItem.question.category}</span><h2>{activePlatformItem.question.prompt}</h2></div>
          </div>
          <Textarea
            label="Основной ответ"
            minRows={7}
            maxLength={12_000}
            disabled={Boolean(activePlatformItem.followUpQuestion)}
            value={activePlatformDraft?.answer ?? ""}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setPlatformDrafts((current) => ({
                ...current,
                [activePlatformItem.question.id]: {
                  answer: value,
                  followUpAnswer:
                    current[activePlatformItem.question.id]?.followUpAnswer ??
                    activePlatformItem.followUpAnswer,
                  secondFollowUpAnswer:
                    current[activePlatformItem.question.id]?.secondFollowUpAnswer ??
                    activePlatformItem.secondFollowUpAnswer ?? "",
                },
              }));
            }}
          />
          {activePlatformItem.followUpQuestion ? (
            <div className="interview-follow-up">
              <span>Уточнение интервьюера</span>
              <h3>{activePlatformItem.followUpQuestion}</h3>
              <Textarea
                minRows={5}
                maxLength={12_000}
                value={activePlatformDraft?.followUpAnswer ?? ""}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setPlatformDrafts((current) => ({
                    ...current,
                    [activePlatformItem.question.id]: {
                      answer:
                        current[activePlatformItem.question.id]?.answer ??
                        activePlatformItem.answer,
                      followUpAnswer: value,
                      secondFollowUpAnswer:
                        current[activePlatformItem.question.id]?.secondFollowUpAnswer ??
                        activePlatformItem.secondFollowUpAnswer ?? "",
                    },
                  }));
                }}
              />
            </div>
          ) : null}
          {activePlatformItem.secondFollowUpQuestion ? (
            <div className="interview-follow-up">
              <span>Второе уточнение</span>
              <h3>{activePlatformItem.secondFollowUpQuestion}</h3>
              <Textarea
                minRows={5}
                maxLength={12_000}
                value={activePlatformDraft?.secondFollowUpAnswer ?? ""}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setPlatformDrafts((current) => ({
                    ...current,
                    [activePlatformItem.question.id]: {
                      answer: current[activePlatformItem.question.id]?.answer ?? activePlatformItem.answer,
                      followUpAnswer: current[activePlatformItem.question.id]?.followUpAnswer ?? activePlatformItem.followUpAnswer,
                      secondFollowUpAnswer: value,
                    },
                  }));
                }}
              />
            </div>
          ) : null}
          <AudioAnswerRecorder
            onTranscribe={(audio) => learningApi.transcribeInterviewAnswer(session.id, audio).then(({ text }) => text)}
            onTranscript={(text) =>
              setPlatformDrafts((current) => {
                const draft = current[activePlatformItem.question.id] ?? {
                  answer: activePlatformItem.answer,
                  followUpAnswer: activePlatformItem.followUpAnswer,
                  secondFollowUpAnswer: activePlatformItem.secondFollowUpAnswer ?? "",
                };
                const key = activePlatformItem.secondFollowUpQuestion
                  ? "secondFollowUpAnswer"
                  : activePlatformItem.followUpQuestion
                    ? "followUpAnswer"
                    : "answer";
                return {
                  ...current,
                  [activePlatformItem.question.id]: {
                    ...draft,
                    [key]: [draft[key].trim(), text].filter(Boolean).join("\n\n"),
                  },
                };
              })
            }
          />
          <Button
            className="primary-button"
            loading={busy === "platform"}
            onClick={() => {
              const draft = activePlatformDraft;
              if (!draft?.answer.trim()) return setError("Сначала дай основной ответ.");
              if (activePlatformItem.followUpQuestion && !draft.followUpAnswer.trim()) {
                return setError("Ответь на уточняющий вопрос.");
              }
              if (
                activePlatformItem.secondFollowUpQuestion &&
                !draft.secondFollowUpAnswer.trim()
              ) {
                return setError("Ответь на второе уточнение.");
              }
              void run("platform", () =>
                learningApi.updateInterviewPlatformAnswer(
                  session.id,
                  activePlatformItem.question.id,
                  draft.answer.trim(),
                  activePlatformItem.followUpQuestion
                    ? draft.followUpAnswer.trim()
                    : undefined,
                  activePlatformItem.secondFollowUpQuestion
                    ? draft.secondFollowUpAnswer.trim()
                    : undefined,
                ),
              );
            }}
          >
            {activePlatformItem.followUpQuestion ? "Оценить и продолжить" : "Оценить ответ"}
          </Button>
          {session.platformItems.some((item) => item.completed && item.assessment) ? (
            <div className="interview-answer-assessments">
              {session.platformItems.filter((item) => item.completed && item.assessment).map((item) => (
                <article key={item.question.id}>
                  <strong>{item.assessment?.score}/100 · {item.question.category}</strong>
                  {item.assessment?.gaps.map((gap) => <span key={gap}>{gap}</span>)}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {session.currentStage === "coding" ? (
        <section className="interview-stage-card">
          <div className="interview-stage-heading"><Code2 /><div><span>Без AI</span><h2>{session.codingExercise.title}</h2></div></div>
          <p>{session.codingExercise.statement}</p>
          <CodeEditor
            ariaLabel={`Решение задачи: ${session.codingExercise.title}`}
            label="Решение"
            minHeight={420}
            value={codingSolution}
            onChange={(value) => setCodingDraft({ sessionId: session.id, value })}
            onRun={() => void run("coding-attempt", () => learningApi.submitInterviewCodingAttempt(session.id, codingSolution))}
          />
          <ExerciseResult exercise={session.codingExercise} />
          <div className="interview-actions">
            <Button className="secondary-button" variant="default" leftSection={<Play size={16} />} loading={busy === "coding-attempt"} onClick={() => void run("coding-attempt", () => learningApi.submitInterviewCodingAttempt(session.id, codingSolution))}>Запустить тесты</Button>
            <Button className="primary-button" disabled={!session.codingExercise.result} loading={busy === "coding-complete"} onClick={() => void run("coding-complete", () => learningApi.completeInterviewCoding(session.id))}>{session.kind === "exam" ? "Перейти к защите" : "Перейти к AI-секции"}</Button>
          </div>
        </section>
      ) : null}

      {session.currentStage === "ai" ? (
        <section className="interview-stage-card interview-ai-stage">
          <div className="interview-stage-heading"><Bot /><div><span>AI разрешён</span><h2>{session.aiExercise.title}</h2></div></div>
          <p>{session.aiExercise.statement}</p>
          <div className="interview-ai-grid">
            <div>
              <CodeEditor
                ariaLabel={`AI-решение задачи: ${session.aiExercise.title}`}
                label="Решение с AI"
                minHeight={460}
                value={aiSolution}
                onChange={(value) => setAiCodeDraft({ sessionId: session.id, value })}
                onRun={() => void run("ai-attempt", () => learningApi.submitInterviewAiAttempt(session.id, aiSolution))}
              />
              <ExerciseResult exercise={session.aiExercise} />
              <Button className="secondary-button" variant="default" leftSection={<Play size={16} />} loading={busy === "ai-attempt"} onClick={() => void run("ai-attempt", () => learningApi.submitInterviewAiAttempt(session.id, aiSolution))}>Запустить тесты</Button>
            </div>
            <div className="interview-ai-chat">
              <div className="interview-message-list">
                {session.aiMessages.map((message) => <p className={message.role} key={message.id}><strong>{message.role === "user" ? "Ты" : "AI"}</strong>{message.content}</p>)}
                {streamedReply ? <p className="assistant streaming"><strong>AI</strong>{streamedReply}</p> : null}
              </div>
              <Textarea minRows={4} placeholder="Спроси про подход, ошибку или тест…" value={aiDraft} onChange={(event) => setAiDraft(event.currentTarget.value)} />
              <Button className="primary-button" leftSection={<Sparkles size={16} />} loading={busy === "ai-message"} onClick={() => {
                if (!aiDraft.trim()) return;
                const content = aiDraft.trim();
                setStreamedReply("");
                void run("ai-message", () => learningApi.sendInterviewAiMessageStream(session.id, content, aiSolution, (delta) => setStreamedReply((current) => current + delta))).then(() => { setAiDraft(""); setStreamedReply(""); });
              }}>Спросить AI</Button>
            </div>
          </div>
          <Button className="primary-button" disabled={!session.aiExercise.result || !session.aiMessages.some((message) => message.role === "user")} loading={busy === "ai-complete"} onClick={() => void run("ai-complete", () => learningApi.completeInterviewAi(session.id))}>Перейти к защите</Button>
        </section>
      ) : null}

      {session.currentStage === "defense" && defenseIndex >= 0 ? (
        <section className="interview-stage-card">
          <div className="interview-stage-heading"><ShieldCheck /><div><span>Защита {defenseIndex + 1}/{session.defenseQuestions.length}</span><h2>{session.defenseQuestions[defenseIndex]}</h2></div></div>
          <Textarea minRows={8} maxLength={12_000} value={defenseDrafts[defenseIndex] ?? session.defenseAnswers[defenseIndex] ?? ""} onChange={(event) => {
            const value = event.currentTarget.value;
            setDefenseDrafts((current) => ({ ...current, [defenseIndex]: value }));
          }} />
          <AudioAnswerRecorder
            onTranscribe={(audio) => learningApi.transcribeInterviewAnswer(session.id, audio).then(({ text }) => text)}
            onTranscript={(text) => setDefenseDrafts((current) => ({ ...current, [defenseIndex]: [current[defenseIndex]?.trim() ?? session.defenseAnswers[defenseIndex]?.trim(), text].filter(Boolean).join("\n\n") }))}
          />
          <Button className="primary-button" loading={busy === "defense" || busy === "complete"} onClick={async () => {
            const answer = (defenseDrafts[defenseIndex] ?? session.defenseAnswers[defenseIndex])?.trim();
            if (!answer) return setError("Сначала ответь на вопрос защиты.");
            const updated = await run("defense", () => learningApi.updateInterviewDefenseAnswer(session.id, defenseIndex, answer));
            if (updated && updated.defenseAnswers.every((item) => item.trim())) {
              await run("complete", () => learningApi.completeInterviewSession(updated.id));
            }
          }}>{defenseIndex === session.defenseQuestions.length - 1 ? "Завершить и оценить" : "Сохранить и дальше"}</Button>
        </section>
      ) : session.currentStage === "defense" ? (
        <section className="interview-stage-card interview-evaluating"><Loader color="mint" /><h2>Готовлю итоговый отчёт</h2><p>Сопоставляю ответы, тесты и работу с AI.</p><Button className="primary-button" loading={busy === "complete"} onClick={() => void run("complete", () => learningApi.completeInterviewSession(session.id))}>Получить оценку</Button></section>
      ) : null}
    </div>
  );
}
