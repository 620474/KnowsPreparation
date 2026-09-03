import { useRef, useState } from "react";
import { Button, Modal, Progress, Slider, Textarea } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

import { learningApi } from "../api";
import type { CheckpointAttemptResult, CheckpointSessionV1 } from "../types";
import { createOperationId } from "../lib/offline-mutation-keys";
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
  const [confidence, setConfidence] = useState(70);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef(0);

  const loadNext = async (source: CheckpointSessionV1) => {
    const next = await learningApi.nextCheckpointItemV9(source.sessionId);
    setSession(next);
    setResult(null);
    setAnswer(next.currentItem?.exercise.starterCode ?? "");
    setExplanation("");
    setSelectedOption(null);
    setConfidence(70);
    startedAt.current = Date.now();
  };

  const start = async () => {
    setBusy(true); setError("");
    try {
      const created = await learningApi.createCheckpointV9(targetId, Math.min(30, Math.max(5, availableMinutes)));
      await loadNext(created);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось начать проверку"); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    const item = session?.currentItem;
    if (!session || !item) return;
    const submittedAnswer = item.exercise.type === "multiple_choice" ? item.exercise.choices[selectedOption ?? -1] ?? "" : answer.trim();
    if (!submittedAnswer) { setError("Сначала дай ответ."); return; }
    setBusy(true); setError("");
    try {
      const checked = await learningApi.submitCheckpointAttemptV9(session.sessionId, {
        operationId: createOperationId(), answer: submittedAnswer, explanation: explanation.trim() || undefined,
        ...(selectedOption === null ? {} : { selectedOptionIndex: selectedOption }), confidenceBefore: confidence,
        durationMs: Date.now() - startedAt.current, deviceClass: window.innerWidth < 800 ? "mobile" : "desktop",
      });
      setResult(checked);
      setSession({ ...session, currentItem: null, completedItems: session.completedItems + 1 });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["readiness-v9", targetId] }),
        queryClient.invalidateQueries({ queryKey: ["decision-v9", targetId] }),
      ]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось проверить ответ"); }
    finally { setBusy(false); }
  };

  const current = readiness.data;
  return (
    <>
      <section className="verified-readiness-card">
        <ShieldCheck size={30} />
        <div>
          <p className="eyebrow">Verified Transfer Readiness · v9</p>
          <h2>{current ? `${Math.round(current.verifiedTransferReadiness)}% подтверждено` : "Проверяю доказательства…"}</h2>
          <p>{current ? `Покрытие ${Math.round(current.verifiedCoverage)}% · ${current.blockers[0] ? `блокер: ${current.blockers[0]}` : "критичных блокеров нет"}` : "Обучение и независимая проверка считаются отдельно."}</p>
          {decision.data?.sufficientForToday ? <small>На сегодня достаточно независимых проверок.</small> : null}
        </div>
        <Button className="primary-button" loading={busy} rightSection={<ArrowRight size={17} />} onClick={() => void start()}>
          Начать проверку
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
            {session.currentItem.exercise.type === "multiple_choice" ? <div className="evidence-choice-list">{session.currentItem.exercise.choices.map((choice, index) => <Button key={choice} variant="default" className={selectedOption === index ? "evidence-choice selected" : "evidence-choice"} onClick={() => setSelectedOption(index)}>{choice}</Button>)}</div> : session.currentItem.exercise.type === "live_coding" || session.currentItem.exercise.type === "bug_fix" ? <CodeEditor value={answer} label="Твоё решение" minHeight={280} onChange={setAnswer} onRun={() => void submit()} /> : <Textarea value={answer} label="Твой ответ" minRows={4} onChange={(event) => setAnswer(event.currentTarget.value)} />}
            {session.currentItem.exercise.requiresExplanation ? <Textarea value={explanation} label="Объяснение" minRows={3} onChange={(event) => setExplanation(event.currentTarget.value)} /> : null}
            <div className="evidence-confidence"><div><strong>Уверенность до результата</strong><span>{confidence}%</span></div><Slider value={confidence} min={0} max={100} step={10} onChange={setConfidence} /></div>
            {error ? <p className="form-error">{error}</p> : null}
            <Button className="primary-button" fullWidth loading={busy} onClick={() => void submit()}>Проверить</Button>
          </div>
        ) : null}
        {result ? <section className={result.passed ? "evidence-result passed" : "evidence-result failed"}><p className="eyebrow">{result.verificationEligibility === "eligible" ? "Независимое evidence" : "Учебное evidence"}</p><h2>{result.score}/100</h2><div className="evidence-answer-comparison"><div className="evidence-answer-block submitted"><strong>Твой ответ:</strong><pre><code>{result.submittedAnswer}</code></pre></div>{result.expectedAnswer ? <div className="evidence-answer-block expected"><strong>Эталон:</strong><pre><code>{result.expectedAnswer}</code></pre></div> : null}</div><ul>{result.feedback.map((item) => <li key={item}>{item}</li>)}</ul><Button className="primary-button" onClick={() => session && void loadNext(session)}>Следующая задача</Button></section> : null}
      </Modal>
    </>
  );
}
