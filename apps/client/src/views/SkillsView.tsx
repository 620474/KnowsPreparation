import { useMemo, useState } from "react";
import { Button, Loader, Progress, Select, TextInput } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BrainCircuit, Clock3, Search, ShieldCheck, Target } from "lucide-react";

import { learningApi } from "../api";

interface SkillsViewProps {
  skillId: string | null;
  onBack: () => void;
  onOpenKnowledge: () => void;
  onOpenSkill: (skillId: string | null) => void;
}

const assistanceLabel = {
  no_ai: "без AI",
  ai_assisted: "с AI",
  normal: "обычный режим",
  unknown: "режим неизвестен",
} as const;

const capabilityLabel: Record<string, string> = {
  recall: "Вспомнить",
  explain: "Объяснить",
  apply: "Применить",
  debug: "Отладить",
  code: "Написать код",
  design: "Спроектировать",
  defend: "Защитить решение",
  transfer: "Перенести в новый контекст",
  resilience: "Работать под давлением",
};

export function SkillsView({ skillId, onBack, onOpenKnowledge, onOpenSkill }: SkillsViewProps) {
  const [target, setTargetState] = useState(
    () => new URLSearchParams(window.location.search).get("target") ?? "general",
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [readiness, setReadiness] = useState("all");
  const targets = useQuery({
    queryKey: ["target-profiles-v2"],
    queryFn: learningApi.listTargetProfilesV2,
  });
  const overview = useQuery({
    queryKey: ["knowledge-overview-v3", target],
    queryFn: () => learningApi.getKnowledgeOverviewV3(target),
  });
  const detail = useQuery({
    queryKey: ["skill-detail-v3", target, skillId],
    queryFn: () => learningApi.getSkillDetailV3(skillId!, target),
    enabled: Boolean(skillId),
  });
  const categories = useMemo(
    () => [...new Set((overview.data?.skills ?? []).map((skill) => skill.category))].sort(),
    [overview.data?.skills],
  );
  const visibleSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
    const priority = new Set(["javascript.oop", "architecture.design-principles"]);
    return [...(overview.data?.skills ?? [])]
      .filter((skill) => category === "all" || skill.category === category)
      .filter((skill) => readiness === "all"
        || (readiness === "gaps" && skill.unknownCapabilities.length > 0)
        || (readiness === "verified" && skill.coverage >= 75))
      .filter((skill) => !normalizedQuery
        || `${skill.label} ${skill.category}`.toLocaleLowerCase("ru-RU").includes(normalizedQuery))
      .sort((left, right) => {
        const priorityDifference = Number(priority.has(right.skillId)) - Number(priority.has(left.skillId));
        return priorityDifference || right.unknownCapabilities.length - left.unknownCapabilities.length
          || left.label.localeCompare(right.label, "ru");
      });
  }, [category, overview.data?.skills, query, readiness]);

  const setTarget = (value: string | null) => {
    if (!value) return;
    const url = new URL(window.location.href);
    if (value === "general") url.searchParams.delete("target");
    else url.searchParams.set("target", value);
    window.history.replaceState(window.history.state, "", url);
    setTargetState(value);
  };

  if (skillId) {
    if (detail.isPending) return <div className="page-loader"><Loader color="brand" /></div>;
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
            <strong>{Math.round(mastery.posteriorMean)}%</strong>
            <span>{Math.round(mastery.lower)}–{Math.round(mastery.upper)}% · покрытие {mastery.coverage}%</span>
          </div>
        </header>

        <section className="skill-capability-grid">
          {mastery.capabilities.map((capability) => (
            <article key={capability.capability}>
              <div>
                <strong>{capabilityLabel[capability.capability] ?? capability.capability}</strong>
                <span>{capability.independentFormCount} форм · {capability.independentContextCount} контекстов</span>
              </div>
              <Progress
                color={capability.evidenceCount === 0 ? "gray" : "brand"}
                value={capability.evidenceCount === 0 ? 0 : capability.posteriorMean}
              />
              <small>
                {capability.evidenceCount === 0
                  ? "Пока не проверено"
                  : `${Math.round(capability.lower)}–${Math.round(capability.upper)}% · без AI: ${capability.noAiEvidenceCount}`}
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
                    <strong>{event.source.taskId}</strong>
                    <span>{event.observations.map((item) => `${item.capability} ${item.score}%`).join(" · ")}</span>
                  </div>
                  <small>
                    <Clock3 size={14} /> {new Date(event.occurredAt).toLocaleDateString("ru-RU")} ·
                    {assistanceLabel[event.assistance.mode]} · {event.source.contextFamilyId}
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

      <Select
        label="Цель подготовки"
        data={(targets.data ?? []).map((item) => ({ value: item.targetId, label: item.label }))}
        value={target}
        onChange={setTarget}
        allowDeselect={false}
      />

      {overview.isPending ? <div className="page-loader"><Loader color="brand" /></div> : null}
      {overview.data ? (
        <>
          <section className="target-readiness-card">
            <Target size={28} />
            <div>
              <p className="eyebrow">{overview.data.readiness.targetLabel}</p>
              <h2>{Math.round(overview.data.readiness.evidenceReadiness.index)}%</h2>
              <p>
                Диапазон {Math.round(overview.data.readiness.evidenceReadiness.lower)}–{Math.round(overview.data.readiness.evidenceReadiness.upper)}% ·
                покрытие {Math.round(overview.data.readiness.evidenceReadiness.coverage)}% · решение: {overview.data.readiness.decision.replace("_", " ")}
              </p>
              <p>
                Прогноз прохождения: {overview.data.readiness.interviewForecast.probability === null
                  ? "недостаточно реальных исходов"
                  : `${Math.round(overview.data.readiness.interviewForecast.probability * 100)}%`}
              </p>
            </div>
          </section>
          <section className="knowledge-catalog-toolbar">
            <div>
              <p className="eyebrow">Каталог знаний</p>
              <h2>Найди тему и продолжи проверку</h2>
              <p>{visibleSkills.length} из {overview.data.skills.length} навыков · ООП и принципы проектирования закреплены в начале списка.</p>
            </div>
            <div className="knowledge-catalog-controls">
              <TextInput
                aria-label="Поиск по навыкам"
                leftSection={<Search size={16} />}
                placeholder="Например: SOLID, ООП, React…"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              <Select
                aria-label="Категория навыков"
                data={[
                  { value: "all", label: "Все категории" },
                  ...categories.map((item) => ({ value: item, label: item })),
                ]}
                value={category}
                onChange={(value) => setCategory(value ?? "all")}
                allowDeselect={false}
              />
              <Select
                aria-label="Статус навыков"
                data={[
                  { value: "all", label: "Любой статус" },
                  { value: "gaps", label: "Есть пробелы" },
                  { value: "verified", label: "Покрытие от 75%" },
                ]}
                value={readiness}
                onChange={(value) => setReadiness(value ?? "all")}
                allowDeselect={false}
              />
            </div>
          </section>
          <section className="skill-overview-grid">
            {visibleSkills.map((skill) => (
              <button key={skill.skillId} type="button" onClick={() => onOpenSkill(skill.skillId)}>
                <div>
                  <span>{skill.category}</span>
                  <strong>{skill.label}</strong>
                  <small>{skill.coverage}% покрытия · неизвестно: {skill.unknownCapabilities.length}</small>
                </div>
                <div className="skill-overview-score">
                  <BrainCircuit size={18} />
                  <strong>{Math.round(skill.posteriorMean)}%</strong>
                </div>
              </button>
            ))}
          </section>
          {visibleSkills.length === 0 ? (
            <section className="empty-state-card">
              <h2>Темы не найдены</h2>
              <p>Сбрось поиск или выбери другую категорию.</p>
              <Button type="button" variant="default" onClick={() => { setQuery(""); setCategory("all"); setReadiness("all"); }}>
                Сбросить фильтры
              </Button>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
