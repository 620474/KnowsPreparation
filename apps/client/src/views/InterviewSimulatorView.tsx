import { useEffect, useMemo, useRef, useState } from "react";
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
  History,
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
import { createOperationId } from "../lib/offline-mutation-keys";
import { runDurableMutation } from "../lib/mutation-outbox";
import { deleteInterviewDraft, readInterviewDraft, writeInterviewDraft } from "../lib/session-drafts";

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

const fallbackCompanyOptions = [
  { value: "general", label: "Общий бигтех" },
  { value: "yandex", label: "Яндекс" },
  { value: "ozon", label: "Ozon" },
  { value: "avito", label: "Avito" },
  { value: "tbank", label: "Т-Банк" },
  { value: "mts", label: "МТС / МГТС" },
  { value: "2gis", label: "2ГИС" },
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

const actionLabels = {
  probe: "Уточнение",
  challenge: "Проверка аргумента",
  counterexample: "Контрпример",
  change_constraint: "Новое ограничение",
  request_code: "Код",
  request_tradeoff: "Компромиссы",
  move_on: "Следующий вопрос",
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
  const companyProfilesQuery = useQuery({
    queryKey: ["company-profiles-v10"],
    queryFn: learningApi.listCompanyProfilesV10,
  });
  const calibrationQuery = useQuery({
    queryKey: ["readiness-calibration"],
    queryFn: learningApi.getReadinessCalibration,
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
  const [directorDraft, setDirectorDraft] = useState("");
  const codingTelemetryRef = useRef({ sessionId: "", openedAt: 0, revisionCount: 0 });
  const restoredDraftSessionId = useRef("");

  const session = selectedSession ?? currentQuery.data ?? null;
  const companyOptions = companyProfilesQuery.data?.map((profile) => ({ value: profile.companyId, label: profile.label })) ?? fallbackCompanyOptions;
  const selectedCompanyProfile = companyProfilesQuery.data?.find((profile) => profile.companyId === company);
  const replayQuery = useQuery({
    queryKey: ["interview-replay-v10", session?.id],
    queryFn: () => learningApi.getInterviewReplayV10(session!.id),
    enabled: Boolean(session?.id && session.status === "completed"),
  });
  const codingSolution = session && codingDraft?.sessionId === session.id
    ? codingDraft.value
    : session?.codingExercise.solution ?? "";
  const aiSolution = session && aiCodeDraft?.sessionId === session.id
    ? aiCodeDraft.value
    : session?.aiExercise.solution ?? "";

  useEffect(() => {
    if (!session?.id || session.status === "completed" || restoredDraftSessionId.current === session.id) return;
    let active = true;
    void readInterviewDraft(session.id).then((draft) => {
      if (!active || !draft) return;
      setPlatformDrafts(draft.platformDrafts);
      setCodingDraft({ sessionId: session.id, value: draft.codingSolution });
      setAiCodeDraft({ sessionId: session.id, value: draft.aiSolution });
      setAiDraft(draft.aiMessage);
      setDefenseDrafts(draft.defenseDrafts);
      setDirectorDraft(draft.directorDraft);
    }).finally(() => {
      if (active) restoredDraftSessionId.current = session.id;
    });
    return () => { active = false; };
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (!session?.id || session.status === "completed" || restoredDraftSessionId.current !== session.id) return;
    const timeout = window.setTimeout(() => {
      void writeInterviewDraft({
        interviewId: session.id,
        platformDrafts,
        codingSolution,
        aiSolution,
        aiMessage: aiDraft,
        defenseDrafts,
        directorDraft,
        updatedAt: new Date().toISOString(),
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [aiDraft, aiSolution, codingSolution, defenseDrafts, directorDraft, platformDrafts, session?.id, session?.status]);

  useEffect(() => {
    if (session?.id && session.status === "completed") void deleteInterviewDraft(session.id);
  }, [session?.id, session?.status]);
  const submitCodingAttempt = async () => {
    if (!session) throw new Error("Интервью не найдено");
    if (codingTelemetryRef.current.sessionId !== session.id) {
      codingTelemetryRef.current = { sessionId: session.id, openedAt: Date.now(), revisionCount: 0 };
    }
    return learningApi.submitInterviewCodingAttempt(session.id, codingSolution, {
      durationMs: Date.now() - codingTelemetryRef.current.openedAt,
      runCount: (session.codingExercise.process?.runCount ?? 0) + 1,
      failedTestCount: session.codingExercise.process?.failedTestCount ?? 0,
      revisionCount: codingTelemetryRef.current.revisionCount,
    });
  };
  const refetchCurrent = currentQuery.refetch;
  const unresolvedPrediction = calibrationQuery.data?.snapshots.find(
    (snapshot) => !calibrationQuery.data?.outcomes.some(
      (outcome) => outcome.predictionSnapshotId === snapshot.snapshotId,
    ),
  );

  const capturePrediction = async () => {
    setBusy("prediction");
    setError("");
    try {
      await learningApi.captureReadinessPrediction(company);
      await calibrationQuery.refetch();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не удалось сохранить снимок");
    } finally {
      setBusy("");
    }
  };

  const recordOutcome = async (technicalPassed: boolean) => {
    if (!unresolvedPrediction) return;
    setBusy("outcome");
    setError("");
    try {
      await learningApi.recordReadinessOutcome(
        unresolvedPrediction.snapshotId,
        unresolvedPrediction.targetId,
        technicalPassed,
      );
      await calibrationQuery.refetch();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не удалось сохранить результат");
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    if (!session || session.status === "completed") return;
    const update = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(session.deadlineAt).getTime() - Date.now()) / 1_000),
      );
      setRemaining(seconds);
      if (seconds === 0 && session.kind === "exam" && !session.expiredAt) {
        void refetchCurrent();
      }
    };
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [refetchCurrent, session]);

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
    return <div className="view-loader"><Loader color="brand" /> Восстанавливаю интервью…</div>;
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
          {selectedCompanyProfile ? (
            <div className="interview-company-profile">
              <strong>{selectedCompanyProfile.summary}</strong>
              <span>{selectedCompanyProfile.focusAreas.join(" · ")}</span>
              <small>Достоверность профиля: {selectedCompanyProfile.confidence}</small>
            </div>
          ) : null}
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

        <section className="interview-calibration-card">
          <div>
            <p className="eyebrow">Калибровка по реальным интервью</p>
            <h2>
              {calibrationQuery.data?.status === "calibrated"
                ? "Прогноз откалиброван"
                : "Прогноз ещё не откалиброван"}
            </h2>
            <p>
              Сохрани индекс непосредственно перед настоящим техэтапом, затем отметь результат.
              Нужны минимум 8 исходов для отображения вероятности.
            </p>
          </div>
          {unresolvedPrediction ? (
            <div className="interview-calibration-result">
              <strong>{unresolvedPrediction.readinessIndex}/100</strong>
              <span>
                {companyOptions.find((option) => option.value === unresolvedPrediction.targetId)?.label}
                {` · покрытие ${unresolvedPrediction.coverage}%`}
              </span>
              <div>
                <Button
                  color="brand"
                  loading={busy === "outcome"}
                  onClick={() => void recordOutcome(true)}
                >
                  Техэтап пройден
                </Button>
                <Button
                  color="red"
                  variant="light"
                  loading={busy === "outcome"}
                  onClick={() => void recordOutcome(false)}
                >
                  Не пройден
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="secondary-button"
              variant="default"
              loading={busy === "prediction"}
              onClick={() => void capturePrediction()}
            >
              Сохранить снимок перед собеседованием
            </Button>
          )}
          <small>
            Реальных исходов: {calibrationQuery.data?.outcomeCount ?? 0}
            {calibrationQuery.data?.brierScore !== null && calibrationQuery.data?.brierScore !== undefined
              ? ` · Brier score ${calibrationQuery.data.brierScore}`
              : ""}
          </small>
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
    const assessmentLabel = evaluation.assessmentSource === "deterministic"
      ? "Только серверные тесты"
      : evaluation.assessmentSource === "mixed"
        ? "AI + серверные тесты"
        : "AI-оценка";
    return (
      <div className="page-stack interview-page">
        <header className="interview-result-hero">
          <div>
            <p className="eyebrow">Готовность · {confidenceLabels[evaluation.readinessConfidence]} · {assessmentLabel}</p>
            <h1>{evaluation.overallScore}<span>/100</span></h1>
            <p>{evaluation.summary}</p>
          </div>
          <ShieldCheck size={62} />
        </header>
        <section className="interview-score-grid">
          {Object.entries(evaluation.sections).map(([key, section]) => (
            <article key={key}>
              <span>{sectionLabels[key as keyof typeof sectionLabels]}</span>
              <strong>{section.assessed === false || section.score === null ? "—" : section.score}</strong>
              <Progress
                color={section.assessed === false || section.score === null ? "gray" : "brand"}
                value={section.assessed === false || section.score === null ? 0 : section.score}
              />
              <p>{section.feedback}</p>
            </article>
          ))}
        </section>
        <section className="interview-result-columns">
          <div><h2>Сильные стороны</h2>{evaluation.strengths.map((item) => <span key={item}>{item}</span>)}</div>
          <div><h2>Слабые темы</h2>{evaluation.weakTopics.map((item) => <span key={item}>{item}</span>)}</div>
          <div><h2>Следующие шаги</h2>{evaluation.recommendations.map((item) => <span key={item}>{item}</span>)}</div>
        </section>
        {replayQuery.data?.events.length ? (
          <section className="interview-replay">
            <div className="section-heading"><div><p className="eyebrow">Replay</p><h2><History size={20} /> Как проходило интервью</h2></div></div>
            <div className="interview-replay-list">
              {replayQuery.data.events.map((event) => (
                <article key={event.eventId}>
                  <span>{new Date(event.occurredAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  <div><strong>{event.title}</strong>{event.content ? <p>{event.content}</p> : null}</div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
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

  if (session.expiredAt) {
    return (
      <div className="page-stack interview-page">
        <header className="interview-session-header">
          <div><p className="eyebrow">Экзамен завершён по таймеру</p><h1>Время истекло</h1></div>
          <span><Clock3 size={17} /> 00:00</span>
        </header>
        <Alert color="yellow" icon={<AlertTriangle size={16} />}>
          Ответы заморожены. Получи оценку по тому, что успел выполнить.
        </Alert>
        {error ? <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert> : null}
        <Button
          className="primary-button"
          loading={busy === "complete"}
          onClick={() => void run("complete", () => learningApi.completeInterviewSession(session.id))}
        >
          Получить итоговую оценку
        </Button>
      </div>
    );
  }

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
      <Progress color="brand" value={Math.max(8, ((stageIndex + 1) / stages.length) * 100)} />
      {error ? <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert> : null}

      {session.currentStage === "platform" && activePlatformItem ? (
        session.engineVersion >= 2 ? (
        <section className="interview-stage-card interview-director-card">
          <div className="interview-platform-progress">
            Interview Director · вопрос {(session.conversationState?.completedQuestions ?? 0) + 1}
            {session.platformQuestionTarget ? ` из ${session.platformQuestionTarget}` : ""}
          </div>
          <div className="interview-transcript" aria-live="polite">
            {session.turns.map((turn) => (
              <article className={turn.role} key={turn.id}>
                <span>
                  {turn.role === "interviewer"
                    ? turn.action
                      ? actionLabels[turn.action]
                      : "Интервьюер"
                    : "Твой ответ"}
                </span>
                <p>{turn.content}</p>
                {turn.assessment && session.kind !== "exam" ? (
                  <small>
                    {turn.assessment.assessed && turn.assessment.score !== null
                      ? `${turn.assessment.score}/100`
                      : "Ответ сохранён"}
                    {turn.assessment.gaps[0] ? ` · ${turn.assessment.gaps[0]}` : ""}
                  </small>
                ) : null}
              </article>
            ))}
          </div>
          <Textarea
            label="Ответ кандидата"
            minRows={7}
            maxLength={12_000}
            placeholder="Сформулируй ответ, обоснуй решение и назови ограничения…"
            value={directorDraft}
            onChange={(event) => setDirectorDraft(event.currentTarget.value)}
          />
          <AudioAnswerRecorder
            onTranscribe={(audio) => learningApi.transcribeInterviewAnswer(session.id, audio).then(({ text }) => text)}
            onTranscript={(text) => setDirectorDraft((current) => [current.trim(), text].filter(Boolean).join("\n\n"))}
          />
          <Button
            className="primary-button"
            loading={busy === "director-turn"}
            onClick={() => {
              const answer = directorDraft.trim();
              if (!answer) return setError("Сначала дай ответ.");
              const operationId = createOperationId();
              void run("director-turn", () =>
                runDurableMutation("interviewTurn", { interviewId: session.id, answer, operationId }, () =>
                  learningApi.submitInterviewTurn(session.id, answer, operationId),
                ),
              ).then((updated) => {
                if (updated) setDirectorDraft("");
              });
            }}
          >
            Ответить интервьюеру
          </Button>
        </section>
        ) : (
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
                  <strong>
                    {item.assessment?.assessed === false || item.assessment?.score === null
                      ? "Не оценено"
                      : `${item.assessment?.score}/100`} · {item.question.category}
                  </strong>
                  {item.assessment?.gaps.map((gap) => <span key={gap}>{gap}</span>)}
                </article>
              ))}
            </div>
          ) : null}
        </section>
        )
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
            onChange={(value) => {
              if (codingTelemetryRef.current.sessionId !== session.id) {
                codingTelemetryRef.current = { sessionId: session.id, openedAt: Date.now(), revisionCount: 0 };
              }
              codingTelemetryRef.current.revisionCount += 1;
              setCodingDraft({ sessionId: session.id, value });
            }}
            onRun={() => void run("coding-attempt", submitCodingAttempt)}
          />
          <ExerciseResult exercise={session.codingExercise} />
          <div className="interview-actions">
            <Button className="secondary-button" variant="default" leftSection={<Play size={16} />} loading={busy === "coding-attempt"} onClick={() => void run("coding-attempt", submitCodingAttempt)}>Запустить тесты</Button>
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
        <section className="interview-stage-card interview-evaluating"><Loader color="brand" /><h2>Готовлю итоговый отчёт</h2><p>Сопоставляю ответы, тесты и работу с AI.</p><Button className="primary-button" loading={busy === "complete"} onClick={() => void run("complete", () => learningApi.completeInterviewSession(session.id))}>Получить оценку</Button></section>
      ) : null}
    </div>
  );
}
