import { useMemo, useRef, useState } from "react";
import { Alert, Button, Loader, NumberInput, Textarea } from "@mantine/core";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FlaskConical,
  RotateCcw,
  Target,
} from "lucide-react";

import { useMission, useMissionActions } from "../hooks/use-learning-missions";
import type { AdaptivePlanItem, LearningMissionStatus, TransferAssessmentResult } from "../types";

interface LearningMissionViewProps {
  missionId: string | null;
  onBack: () => void;
  onOpenIntervention: (item: AdaptivePlanItem) => void;
}

const statusLabels: Record<LearningMissionStatus, string> = {
  diagnosed: "Диагностирован пробел",
  intervention: "Разбор и тренировка",
  immediate_verify: "Немедленная проверка",
  consolidation: "Закрепление",
  delayed_verify: "Отложенная проверка",
  closed: "Навык подтверждён",
  reopened: "Нужен ещё один цикл",
  skipped: "Миссия пропущена",
};

const formatLabels = {
  prediction: "Прогноз выполнения",
  bug_triage: "Диагностика дефекта",
  constraint_flip: "Изменение ограничений",
} as const;

export function LearningMissionView({ missionId, onBack, onOpenIntervention }: LearningMissionViewProps) {
  const missionQuery = useMission(missionId);
  const actions = useMissionActions(missionId ?? "");
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState(60);
  const [result, setResult] = useState<TransferAssessmentResult | null>(null);
  const [message, setMessage] = useState("");
  const startedAtRef = useRef(0);
  const mission = missionQuery.data;
  const assessment = useMemo(() => {
    if (!mission) return null;
    return mission.status === "delayed_verify"
      ? mission.delayedVerification
      : mission.verification;
  }, [mission]);

  if (missionQuery.isPending) {
    return <div className="view-loader"><Loader color="brand" size="sm" /> Загружаю миссию…</div>;
  }
  if (!mission || missionQuery.isError) {
    return (
      <div className="mission-page page-stack">
        <Button leftSection={<ArrowLeft size={17} />} variant="subtle" onClick={onBack}>Назад</Button>
        <Alert color="red">Миссия не найдена или API временно недоступен.</Alert>
      </div>
    );
  }

  const begin = async () => {
    setMessage("");
    try {
      await actions.runAction("start");
      onOpenIntervention(mission.intervention);
    } catch (error) {
      if (!navigator.onLine) {
        setMessage("Действие сохранено офлайн и отправится при подключении.");
        onOpenIntervention(mission.intervention);
      } else {
        setMessage(error instanceof Error ? error.message : "Не удалось начать миссию");
      }
    }
  };

  const submit = async () => {
    if (!answer.trim()) return;
    setMessage("");
    setResult(null);
    try {
      const nextResult = await actions.submitTransfer({
        answer,
        confidence,
        responseTimeMs: startedAtRef.current ? Date.now() - startedAtRef.current : 0,
      });
      setResult(nextResult);
      setAnswer("");
      startedAtRef.current = Date.now();
    } catch (error) {
      setMessage(!navigator.onLine
        ? "Ответ сохранён на устройстве и будет проверен после подключения."
        : error instanceof Error ? error.message : "Не удалось проверить ответ");
    }
  };

  return (
    <div className="mission-page page-stack">
      <Button className="mission-back" leftSection={<ArrowLeft size={17} />} variant="subtle" onClick={onBack}>
        К сегодняшним миссиям
      </Button>

      <section className="mission-hero">
        <div className="mission-status"><Target size={16} /> {statusLabels[mission.status]}</div>
        <p className="eyebrow">Учебная миссия · {mission.skillLabel}</p>
        <h1>{mission.title}</h1>
        <p>{mission.reason}</p>
        <div className="mission-metrics">
          <span><BrainCircuit size={18} /> Capability: {mission.capability}</span>
          <span><Target size={18} /> Цель: {mission.objective.minimumScore}/100</span>
          <span><RotateCcw size={18} /> Попыток: {mission.verificationAttempts}/{mission.objective.maximumVerificationAttempts}</span>
        </div>
      </section>

      {message ? <Alert color={navigator.onLine ? "yellow" : "blue"}>{message}</Alert> : null}

      {(mission.status === "diagnosed" || mission.status === "reopened") ? (
        <section className="mission-step-card">
          <p className="eyebrow">Шаг 1 · Интервенция</p>
          <h2>{mission.intervention.title}</h2>
          <p>{mission.intervention.reason}</p>
          <div className="mission-step-meta"><Clock3 size={17} /> {mission.intervention.minutes} минут</div>
          <Button className="primary-button" loading={actions.actionMutation.isPending} rightSection={<ArrowRight size={17} />} onClick={begin}>
            Начать разбор
          </Button>
        </section>
      ) : null}

      {mission.status === "intervention" ? (
        <section className="mission-step-card">
          <p className="eyebrow">Шаг 1 · В процессе</p>
          <h2>{mission.intervention.title}</h2>
          <p>Изучи материал или реши практику. После этого переходи к независимой проверке без подсказок.</p>
          <div className="mission-inline-actions">
            <Button variant="default" onClick={() => onOpenIntervention(mission.intervention)}>Открыть материал</Button>
            <Button className="primary-button" loading={actions.actionMutation.isPending} onClick={() => actions.runAction("complete_intervention")}>
              Готов к проверке
            </Button>
          </div>
        </section>
      ) : null}

      {(mission.status === "immediate_verify" || mission.status === "delayed_verify") && assessment ? (
        <section className="mission-step-card transfer-lab-card">
          <div className="mission-step-heading">
            <div>
              <p className="eyebrow">Transfer Lab · {formatLabels[assessment.format]}</p>
              <h2>{assessment.title}</h2>
            </div>
            <FlaskConical size={28} />
          </div>
          <p>{assessment.prompt}</p>
          {assessment.code ? <pre className="transfer-code"><code>{assessment.code}</code></pre> : null}
          {assessment.constraints.length ? (
            <ul>{assessment.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
          ) : null}
          <Textarea
            autosize
            minRows={6}
            label="Твой ответ и объяснение"
            placeholder={assessment.answerPlaceholder}
            value={answer}
            onFocus={() => {
              if (!startedAtRef.current) startedAtRef.current = Date.now();
            }}
            onChange={(event) => setAnswer(event.currentTarget.value)}
          />
          <NumberInput
            label="Уверенность, %"
            min={0}
            max={100}
            value={confidence}
            onChange={(value) => setConfidence(typeof value === "number" ? value : 60)}
          />
          <Button className="primary-button" disabled={!answer.trim()} loading={actions.transferMutation.isPending} onClick={submit}>
            Проверить без AI
          </Button>
        </section>
      ) : null}

      {mission.status === "consolidation" ? (
        <section className="mission-step-card mission-waiting">
          <CalendarClock size={34} />
          <div>
            <p className="eyebrow">Шаг 3 · Закрепление</p>
            <h2>Первая проверка пройдена</h2>
            <p>Повторная независимая проверка откроется {mission.dueAt ? new Date(mission.dueAt).toLocaleString("ru-RU") : "через несколько дней"}.</p>
          </div>
        </section>
      ) : null}

      {mission.status === "closed" ? (
        <section className="mission-step-card mission-complete">
          <CheckCircle2 size={38} />
          <div><h2>Навык подтверждён</h2><p>Две проверки в разных семействах заданий прошли успешно.</p></div>
        </section>
      ) : null}

      {result ? (
        <Alert color={result.passed ? "green" : "orange"} title={`Результат: ${result.score}/100`}>
          {result.feedback.map((item) => <div key={item}>{item}</div>)}
        </Alert>
      ) : null}

      {!["closed", "skipped"].includes(mission.status) ? (
        <div className="mission-secondary-actions">
          <Button variant="default" onClick={() => actions.runAction("defer")}>Отложить на день</Button>
          <Button color="red" variant="subtle" onClick={() => actions.runAction("skip")}>Пропустить миссию</Button>
        </div>
      ) : null}
    </div>
  );
}
