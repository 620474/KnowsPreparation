import { useState } from "react";
import { Button, Loader, Progress, SegmentedControl } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BrainCircuit, Clock3, ShieldCheck, Target } from "lucide-react";

import { learningApi } from "../api";

interface SkillsViewProps {
  skillId: string | null;
  onBack: () => void;
  onOpenKnowledge: () => void;
  onOpenSkill: (skillId: string | null) => void;
}

const confidenceLabel = {
  low: "мало данных",
  medium: "средняя уверенность",
  high: "высокая уверенность",
} as const;

const assistanceLabel = {
  no_ai: "без AI",
  ai_assisted: "с AI",
  normal: "обычный режим",
  unknown: "режим неизвестен",
} as const;

export function SkillsView({ skillId, onBack, onOpenKnowledge, onOpenSkill }: SkillsViewProps) {
  const [target, setTargetState] = useState(
    () => new URLSearchParams(window.location.search).get("target") ?? "general",
  );
  const overview = useQuery({
    queryKey: ["knowledge-overview", target],
    queryFn: () => learningApi.getKnowledgeOverview(target),
  });
  const detail = useQuery({
    queryKey: ["skill-detail", skillId],
    queryFn: () => learningApi.getSkillDetail(skillId!),
    enabled: Boolean(skillId),
  });

  const setTarget = (value: string) => {
    const url = new URL(window.location.href);
    if (value === "general") url.searchParams.delete("target");
    else url.searchParams.set("target", value);
    window.history.replaceState(window.history.state, "", url);
    setTargetState(value);
  };

  if (skillId) {
    if (detail.isPending) return <div className="page-loader"><Loader color="mint" /></div>;
    if (!detail.data) return <div className="page-stack"><p>Не удалось загрузить навык.</p></div>;
    const { definition, mastery, evidence } = detail.data;
    return (
      <div className="page-stack">
        <header className="page-header skill-detail-header">
          <div>
            <Button
              className="secondary-button"
              leftSection={<ArrowLeft size={17} />}
              type="button"
              variant="default"
              onClick={() => onOpenSkill(null)}
            >
              Все навыки
            </Button>
            <p className="eyebrow">{definition.category} · Evidence profile</p>
            <h1>{definition.label}</h1>
            <p>{definition.description}</p>
          </div>
          <div className="skill-score-card">
            <strong>{mastery.estimate ?? "—"}{mastery.estimate === null ? "" : "%"}</strong>
            <span>{confidenceLabel[mastery.confidence]}</span>
          </div>
        </header>

        <section className="skill-capability-grid">
          {mastery.capabilities.map((capability) => (
            <article key={capability.capability}>
              <div>
                <strong>{capability.capability}</strong>
                <span>{capability.independentFamilyCount} независимых семейств</span>
              </div>
              <Progress color={capability.estimate === null ? "gray" : "mint"} value={capability.estimate ?? 0} />
              <small>
                {capability.estimate === null
                  ? "Пока не проверено"
                  : `${capability.lower}–${capability.upper}% · transfer: ${capability.transferEvidenceCount}`}
              </small>
            </article>
          ))}
        </section>

        <section className="analytics-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Почему система так считает</p>
              <h2>Доказательства навыка</h2>
            </div>
            <ShieldCheck size={24} />
          </div>
          {evidence.length ? (
            <div className="skill-evidence-list">
              {evidence.map((event) => (
                <article key={event.eventId}>
                  <div>
                    <strong>{event.source.itemId ?? event.source.kind}</strong>
                    <span>{event.observations.map((item) => `${item.capability} ${item.score}%`).join(" · ")}</span>
                  </div>
                  <small>
                    <Clock3 size={14} /> {new Date(event.occurredAt).toLocaleDateString("ru-RU")} ·
                    {assistanceLabel[event.assistance.mode]} · {event.transferLevel}
                  </small>
                </article>
              ))}
            </div>
          ) : <p>Пока нет измеримых попыток. Today предложит диагностическое задание.</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="page-header skills-header">
        <div>
          <Button className="secondary-button" leftSection={<ArrowLeft size={17} />} variant="default" onClick={onBack}>
            Сегодня
          </Button>
          <p className="eyebrow">Skill Graph · {overview.data?.ontologyVersion ?? "frontend-v1"}</p>
          <h1>Не что пройдено, а что доказано</h1>
          <p>Оценка учитывает независимые задания, свежесть, перенос знания и помощь AI.</p>
        </div>
        <Button className="secondary-button" variant="default" onClick={onOpenKnowledge}>
          Все инструменты знаний
        </Button>
      </header>

      <SegmentedControl
        data={[
          { value: "general", label: "Общий Frontend" },
          { value: "yandex", label: "Яндекс" },
          { value: "ozon", label: "Ozon" },
        ]}
        value={target}
        onChange={setTarget}
      />

      {overview.isPending ? <div className="page-loader"><Loader color="mint" /></div> : null}
      {overview.data ? (
        <>
          <section className="target-readiness-card">
            <Target size={28} />
            <div>
              <p className="eyebrow">{overview.data.readiness.targetLabel}</p>
              <h2>{overview.data.readiness.estimate ?? "—"}{overview.data.readiness.estimate === null ? "" : "%"}</h2>
              <p>
                Диапазон {overview.data.readiness.lower ?? "—"}–{overview.data.readiness.upper ?? "—"}% ·
                покрытие {overview.data.readiness.coverage}% · без AI {overview.data.readiness.integrityCoverage}%
              </p>
            </div>
          </section>
          <section className="skill-overview-grid">
            {overview.data.skills.map((skill) => (
              <button key={skill.skillId} type="button" onClick={() => onOpenSkill(skill.skillId)}>
                <div>
                  <span>{skill.category}</span>
                  <strong>{skill.label}</strong>
                  <small>{skill.independentFamilyCount} семейств · transfer {skill.transferEvidenceCount}</small>
                </div>
                <div className="skill-overview-score">
                  <BrainCircuit size={18} />
                  <strong>{skill.estimate ?? "—"}{skill.estimate === null ? "" : "%"}</strong>
                </div>
              </button>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
