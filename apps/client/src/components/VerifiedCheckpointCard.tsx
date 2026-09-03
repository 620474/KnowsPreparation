import { useEffect, useRef, useState } from "react";
import { Button, Modal, Progress, Slider, Textarea } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

import { learningApi } from "../api";
import type { CheckpointAttemptResult, CheckpointSessionV1 } from "../types";
import { createOperationId } from "../lib/offline-mutation-keys";
import { runDurableMutation } from "../lib/mutation-outbox";
import { CodeEditor } from "./CodeEditor";

interface Props { targetId: string; availableMinutes: number; }

export function VerifiedCheckpointCard({ targetId, availableMinutes }: Props) {
  const queryClient = useQueryClient();
  const readiness = useQuery({ queryKey: ["readiness-v9", targetId], queryFn: () => learningApi.getReadinessV9(targetId) });
  const decision = useQuery({ queryKey: ["decision-v9", targetId, availableMinutes], queryFn: () => learningApi.getDecisionPlanV9(targetId, availableMinutes) });
  const [session, setSession] = useState<CheckpointSessionV1 | null>(null);
  const [result, setResult] = useState<CheckpointAttemptResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confidenceBefore, setConfidenceBefore] = useState(70);
  const [confidenceAfter, setConfidenceAfter] = useState(70);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef(0);

  useEffect(() => {
    const item = session?.currentItem;
    if (!item || result) return;
    localStorage.setItem(`checkpoint-draft:${item.leaseId}`, JSON.stringify({
      sessionId: session.sessionId, leaseId: item.leaseId, answer, explanation, selectedOption,
      confidenceBefore, confidenceAfter, answerLocked, operationId, startedAt: startedAt.current,
    }));
  }, [answer, answerLocked, confidenceAfter, confidenceBefore, explanation, operationId, result, selectedOption, session]);

  const loadNext = async (source: CheckpointSessionV1) => {
    const next = await learningApi.nextCheckpointItemV9(source.sessionId);
    setSession(next);
    setResult(null);
    const item = next.currentItem;
    const stored = item ? localStorage.getItem(`checkpoint-draft:${item.leaseId}`) : null;
    let draft: Record<string, unknown> | null = null;
    try { draft = stored ? JSON.parse(stored) as Record<string, unknown> : null; } catch { draft = null; }
    setAnswer(typeof draft?.answer === "string" ? draft.answer : item?.exercise.starterCode ?? "");
    setExplanation(typeof draft?.explanation === "string" ? draft.explanation : "");
    setSelectedOption(typeof draft?.selectedOption === "number" ? draft.selectedOption : null);
    setConfidenceBefore(typeof draft?.confidenceBefore === "number" ? draft.confidenceBefore : 70);
    setConfidenceAfter(typeof draft?.confidenceAfter === "number" ? draft.confidenceAfter : 70);
    setAnswerLocked(draft?.answerLocked === true);
    setOperationId(typeof draft?.operationId === "string" ? draft.operationId : null);
    startedAt.current = typeof draft?.startedAt === "number" ? draft.startedAt : Date.now();
  };

  const start = async () => {
    setBusy(true); setError("");
    try {
      const resumable = decision.data?.actions.find((action) => action.title.startsWith("Продолжить"));
      const source = resumable
        ? await learningApi.getCheckpointV9(resumable.actionId)
        : await learningApi.createCheckpointV9(targetId, Math.min(30, Math.max(5, availableMinutes)));
      await loadNext(source);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось начать проверку"); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    const item = session?.currentItem;
    if (!session || !item) return;
    const submittedAnswer = item.exercise.type === "multiple_choice" ? item.exercise.choices[selectedOption ?? -1] ?? "" : answer.trim();
    if (!submittedAnswer) { setError("Сначала дай ответ."); return; }
    if (!answerLocked) {
      setAnswerLocked(true);
      setOperationId(createOperationId());
      setError("Теперь оцени уверенность после решения — до показа ответа.");
      return;
    }
    setBusy(true); setError("");
    try {
      const variables = {
        sessionId: session.sessionId, leaseId: item.leaseId, operationId: operationId ?? createOperationId(), answer: submittedAnswer,
        explanation: explanation.trim() || undefined, ...(selectedOption === null ? {} : { selectedOptionIndex: selectedOption }),
        confidenceBefore, confidenceAfter, durationMs: Date.now() - startedAt.current,
        networkInterrupted: !navigator.onLine, deviceClass: window.innerWidth < 800 ? "mobile" as const : "desktop" as const,
      };
      const checked = await runDurableMutation("checkpointAttempt", variables, () => {
        const { sessionId, ...input } = variables;
        return learningApi.submitCheckpointAttemptV9(sessionId, input);
      });
      localStorage.removeItem(`checkpoint-draft:${item.leaseId}`);
      setResult(checked);
      setSession({ ...session, revision: session.revision + 1, currentItem: null, completedItems: session.completedItems + 1 });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["readiness-v9", targetId] }),
        queryClient.invalidateQueries({ queryKey: ["decision-v9", targetId] }),
      ]);
    } catch (cause) { setError(!navigator.onLine ? "Ответ сохранён на устройстве и отправится после восстановления сети." : cause instanceof Error ? cause.message : "Не удалось проверить ответ"); }
    finally { setBusy(false); }
  };

  const current = readiness.data;
  const verifiedCount = current?.capabilities.filter((item) => item.status === "verified").length ?? 0;
  const readinessLabel = current?.status === "ready" ? "Подтверждённая готовность высокая"
    : current?.status === "not_ready" ? "Есть подтверждённые пробелы" : "Недостаточно независимых данных";
  return (
    <>
      <section className="verified-readiness-card">
        <ShieldCheck size={30} />
        <div>
          <p className="eyebrow">Verified Transfer Readiness · v9</p>
          <h2>{current ? readinessLabel : "Проверяю доказательства…"}</h2>
          <p>{current ? `Освоение материала ${Math.round(current.learningMastery)}% · подтверждено ${verifiedCount}/${current.capabilities.length} навыков${current.blockers[0] ? ` · блокер: ${current.blockers[0]}` : ""}` : "Обучение и независимая проверка считаются отдельно."}</p>
          {current ? <small>Прогноз интервью: {current.interviewForecast.status === "experimental" ? "недостаточно реальных результатов" : `${current.interviewForecast.status}, ${current.interviewForecast.outcomeCount} исходов`} — не влияет на Verified Readiness.</small> : null}
          {decision.data?.sufficientForToday ? <small>На сегодня достаточно независимых проверок.</small> : null}
          {decision.data?.actions.length ? <div className="verified-decision-list">{decision.data.actions.map((action) => <div key={action.actionId}><strong>{action.title}</strong><small>{action.whyNow} · {action.estimatedMinutes} мин.</small></div>)}</div> : null}
          {current ? <details className="verified-reasons"><summary>Почему такая оценка</summary>{current.capabilities.slice(0, 8).map((capability) => <p key={`${capability.skillId}:${capability.capability}`}><strong>{capability.skillId} · {capability.capability}</strong>: {capability.status}, {capability.independentFormCount} форм, диапазон {capability.lower ?? "?"}–{capability.upper ?? "?"}%{capability.reasonCodes.length ? ` · ${capability.reasonCodes.join(", ")}` : ""}</p>)}</details> : null}
        </div>
        <Button className="primary-button" loading={busy} rightSection={<ArrowRight size={17} />} onClick={() => void start()}>
          {decision.data?.actions.some((action) => action.title.startsWith("Продолжить")) ? "Продолжить проверку" : "Начать проверку"}
        </Button>
      </section>

      <Modal opened={Boolean(session)} onClose={() => setSession(null)} title="Независимая проверка" fullScreen={window.innerWidth < 700} size="xl">
        {session ? <Progress value={session.totalItems ? session.completedItems / session.totalItems * 100 : 0} mb="lg" /> : null}
        {session?.status === "completed" || (session && !session.currentItem && !result) ? (
          <div className="checkpoint-complete"><CheckCircle2 size={42} /><h2>Проверка завершена</h2><p>Verified Readiness пересчитана только по независимым ответам.</p><Button onClick={() => setSession(null)}>Закрыть</Button></div>
        ) : null}
        {session?.currentItem && !result ? (
          <div className="checkpoint-question">
            <p className="eyebrow">{session.currentItem.category} · без AI и подсказок</p>
            <h2>{session.currentItem.prompt}</h2>
            <p>{session.currentItem.exercise.instructions}</p>
            {session.currentItem.exercise.code ? <pre className="evidence-code"><code>{session.currentItem.exercise.code}</code></pre> : null}
            {session.currentItem.exercise.type === "multiple_choice" ? <div className="evidence-choice-list">{session.currentItem.exercise.choices.map((choice, index) => <Button key={choice} variant="default" disabled={answerLocked} className={selectedOption === index ? "evidence-choice selected" : "evidence-choice"} onClick={() => setSelectedOption(index)}>{choice}</Button>)}</div> : session.currentItem.exercise.type === "live_coding" || session.currentItem.exercise.type === "bug_fix" ? <CodeEditor value={answer} label="Твоё решение" minHeight={280} onChange={(value) => { setAnswer(value); if (answerLocked) { setAnswerLocked(false); setOperationId(null); } }} onRun={() => void submit()} /> : <Textarea value={answer} disabled={answerLocked} label="Твой ответ" minRows={4} onChange={(event) => setAnswer(event.currentTarget.value)} />}
            {session.currentItem.exercise.requiresExplanation ? <Textarea value={explanation} disabled={answerLocked} label="Объяснение" minRows={3} onChange={(event) => setExplanation(event.currentTarget.value)} /> : null}
            <div className="evidence-confidence"><div><strong>{answerLocked ? "Уверенность после решения" : "Уверенность до решения"}</strong><span>{answerLocked ? confidenceAfter : confidenceBefore}%</span></div><Slider value={answerLocked ? confidenceAfter : confidenceBefore} min={0} max={100} step={10} onChange={answerLocked ? setConfidenceAfter : setConfidenceBefore} /></div>
            {error ? <p className="form-error">{error}</p> : null}
            <Button className="primary-button" fullWidth loading={busy} onClick={() => void submit()}>{answerLocked ? "Отправить и показать результат" : "Зафиксировать ответ"}</Button>
          </div>
        ) : null}
        {result ? <section className={result.passed ? "evidence-result passed" : "evidence-result failed"}><p className="eyebrow">{result.verificationEligibility === "eligible" ? "Независимое evidence" : "Учебное evidence"}</p><h2>{result.score}/100</h2><div className="evidence-answer-comparison"><div className="evidence-answer-block submitted"><strong>Твой ответ:</strong><pre><code>{result.submittedAnswer}</code></pre></div>{result.expectedAnswer ? <div className="evidence-answer-block expected"><strong>Эталон:</strong><pre><code>{result.expectedAnswer}</code></pre></div> : null}</div><ul>{result.feedback.map((item) => <li key={item}>{item}</li>)}</ul><Button className="primary-button" onClick={() => session && void loadNext(session)}>Следующая задача</Button></section> : null}
      </Modal>
    </>
  );
}
