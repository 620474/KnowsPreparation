import { useMemo, useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Loader,
  MultiSelect,
  Progress,
  Select,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Flag,
  FlaskConical,
  Save,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";

import { learningApi } from "../api";
import { ResearchProjectList } from "../features/research/ResearchProjectList";
import {
  criticalResearchGates,
  RESEARCH_PROJECTS_QUERY_KEY,
  researchDesignOptions,
  researchGateLabels,
  researchGateStatusOptions,
  researchProjectStatusOptions,
  researchStageLabels,
  researchStageStatusOptions,
} from "../lib/research";
import type {
  CreateResearchClaim,
  CreateResearchEvidence,
  ResearchClaimConfidence,
  ResearchDesign,
  ResearchEvidenceFreshness,
  ResearchEvidenceIndependence,
  ResearchEvidenceQuality,
  ResearchEvidenceRelationStance,
  ResearchEvidenceSourceKind,
  ResearchProjectStatus,
  ResearchWorkspace,
  ResearchAgentRun,
  ResearchAgentMode,
  ResearchAgentType,
  UpdateResearchProject,
} from "../types";

const workspaceKey = (projectId: string) => ["research-workspace", projectId] as const;

interface ResearchViewProps {
  projectId: string | null;
  onOpenProject: (projectId: string | null) => void;
}

const emptyEvidence: CreateResearchEvidence = {
  title: "",
  url: "",
  sourceType: "",
  stance: "neutral",
  quality: "unassessed",
  notes: "",
  sourceKind: "unassessed",
  author: "",
  publishedAt: null,
  accessedAt: new Date().toISOString().slice(0, 10),
  originId: "",
  independence: "unknown",
  freshness: "unassessed",
};

const emptyClaim: CreateResearchClaim = {
  text: "",
  status: "draft",
  confidence: "unassessed",
  evidenceIds: [],
  evidenceLinks: [],
  alternativeExplanations: "",
  uncertainty: "",
};

const createLocalId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU") : "Без срока";

export function ResearchView({ projectId, onOpenProject }: ResearchViewProps) {
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({
    queryKey: RESEARCH_PROJECTS_QUERY_KEY,
    queryFn: learningApi.listResearchProjects,
  });
  const workspaceQuery = useQuery({
    queryKey: projectId ? workspaceKey(projectId) : ["research-workspace", "none"],
    queryFn: () => learningApi.getResearchWorkspace(projectId!),
    enabled: Boolean(projectId),
  });
  const [message, setMessage] = useState("");

  const refresh = async (targetProjectId?: string) => {
    await queryClient.invalidateQueries({ queryKey: RESEARCH_PROJECTS_QUERY_KEY });
    if (targetProjectId) {
      await queryClient.invalidateQueries({ queryKey: workspaceKey(targetProjectId) });
    }
  };

  const createProject = useMutation({
    mutationFn: learningApi.createResearchProject,
    onSuccess: async (project) => {
      await refresh(project.projectId);
      onOpenProject(project.projectId);
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const deleteProject = useMutation({
    mutationFn: learningApi.deleteResearchProject,
    onSuccess: async () => {
      onOpenProject(null);
      await refresh();
    },
    onError: (error: Error) => setMessage(error.message),
  });

  if (projectId) {
    if (workspaceQuery.isPending || !workspaceQuery.data) {
      return <div className="view-loader"><Loader color="brand" size="sm" /> Загружаю исследование…</div>;
    }
    return (
      <ResearchWorkspacePanel
        key={workspaceQuery.data.project.updatedAt}
        workspace={workspaceQuery.data}
        onBack={() => onOpenProject(null)}
        onChanged={() => refresh(projectId)}
        onDelete={() => {
          if (window.confirm("Удалить исследование вместе с источниками и выводами?")) {
            deleteProject.mutate(projectId);
          }
        }}
        onMessage={setMessage}
        message={message}
      />
    );
  }

  const projects = projectsQuery.data ?? [];
  return (
    <ResearchProjectList
      creating={createProject.isPending}
      message={message}
      projects={projects}
      onCreate={(draft) => {
        setMessage("");
        createProject.mutate(draft);
      }}
      onOpenProject={onOpenProject}
    />
  );
}

interface WorkspacePanelProps {
  workspace: ResearchWorkspace;
  message: string;
  onBack: () => void;
  onChanged: () => Promise<void>;
  onDelete: () => void;
  onMessage: (message: string) => void;
}

function ResearchWorkspacePanel({
  workspace,
  message,
  onBack,
  onChanged,
  onDelete,
  onMessage,
}: WorkspacePanelProps) {
  const project = workspace.project;
  const [draft, setDraft] = useState(project);
  const [evidenceDraft, setEvidenceDraft] = useState(emptyEvidence);
  const [claimDraft, setClaimDraft] = useState(emptyClaim);
  const [riskTitle, setRiskTitle] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

  const updateProject = useMutation({
    mutationFn: (patch: UpdateResearchProject) => learningApi.updateResearchProject(project.projectId, patch),
    onSuccess: onChanged,
    onError: (error: Error) => onMessage(error.message),
  });
  const createEvidence = useMutation({
    mutationFn: (data: CreateResearchEvidence) => learningApi.createResearchEvidence(project.projectId, data),
    onSuccess: async () => { setEvidenceDraft(emptyEvidence); await onChanged(); },
    onError: (error: Error) => onMessage(error.message),
  });
  const deleteEvidence = useMutation({
    mutationFn: (evidenceId: string) => learningApi.deleteResearchEvidence(project.projectId, evidenceId),
    onSuccess: onChanged,
    onError: (error: Error) => onMessage(error.message),
  });
  const createClaim = useMutation({
    mutationFn: (data: CreateResearchClaim) => learningApi.createResearchClaim(project.projectId, data),
    onSuccess: async () => { setClaimDraft(emptyClaim); await onChanged(); },
    onError: (error: Error) => onMessage(error.message),
  });
  const deleteClaim = useMutation({
    mutationFn: (claimId: string) => learningApi.deleteResearchClaim(project.projectId, claimId),
    onSuccess: onChanged,
    onError: (error: Error) => onMessage(error.message),
  });
  const updateActionStatus = useMutation({
    mutationFn: ({ actionId, status }: { actionId: string; status: "approved" | "completed" | "rejected" }) =>
      learningApi.updateResearchActionStatus(project.projectId, actionId, status),
    onSuccess: onChanged,
    onError: (error: Error) => onMessage(error.message),
  });

  const completedStages = project.stages.filter((stage) =>
    stage.status === "complete" || stage.status === "not_applicable"
  ).length;
  const progress = Math.round((completedStages / project.stages.length) * 100);
  const blockedGates = project.qualityGates.filter((gate) => gate.status === "blocked");
  const orphanClaims = workspace.claims.filter(
    (claim) => claim.evidenceIds.length === 0 && claim.evidenceLinks.length === 0,
  ).length;
  const evidenceOptions = useMemo(
    () => workspace.evidence.map((entry) => ({ value: entry.evidenceId, label: entry.title })),
    [workspace.evidence],
  );

  function saveOverview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onMessage("");
    updateProject.mutate({
      title: draft.title,
      decisionStatement: draft.decisionStatement,
      primaryQuestion: draft.primaryQuestion,
      scope: draft.scope,
      design: draft.design,
      status: draft.status,
      startDate: draft.startDate,
      targetDate: draft.targetDate,
      nextAction: draft.nextAction,
      protocol: draft.protocol,
    });
  }

  const selectedEvidenceIds = claimDraft.evidenceLinks.map((link) => link.evidenceId);

  const updateSelectedEvidence = (evidenceIds: string[]) => {
    setClaimDraft({
      ...claimDraft,
      evidenceIds: [],
      evidenceLinks: evidenceIds.map((evidenceId) =>
        claimDraft.evidenceLinks.find((link) => link.evidenceId === evidenceId) ?? {
          evidenceId,
          stance: "supports",
          excerpt: "",
          locator: "",
          notes: "",
        }
      ),
    });
  };

  const updateEvidenceLink = (
    evidenceId: string,
    patch: Partial<CreateResearchClaim["evidenceLinks"][number]>,
  ) => {
    setClaimDraft({
      ...claimDraft,
      evidenceLinks: claimDraft.evidenceLinks.map((link) =>
        link.evidenceId === evidenceId ? { ...link, ...patch } : link
      ),
    });
  };

  return (
    <div className="page-stack research-page">
      <header className="page-header research-workspace-header">
        <div>
          <Button className="secondary-button" leftSection={<ArrowLeft size={17} />} type="button" variant="default" onClick={onBack}>К проектам</Button>
          <p className="eyebrow">Исследовательский проект</p>
          <h1>{project.title}</h1>
          <p>{project.primaryQuestion || "Главный вопрос пока не сформулирован."}</p>
        </div>
        <div className="research-progress-summary">
          <strong>{progress}%</strong>
          <span>{completedStages}/{project.stages.length} этапов</span>
          <Progress color={blockedGates.length ? "red" : "brand"} value={progress} size="sm" />
        </div>
      </header>

      {message ? <Alert color="red" icon={<AlertTriangle size={17} />}>{message}</Alert> : null}
      {blockedGates.length || orphanClaims ? (
        <Alert color="yellow" icon={<ShieldAlert size={18} />}>
          {blockedGates.length ? `Критических проблем: ${blockedGates.length}. ` : ""}
          {orphanClaims ? `Выводов без доказательств: ${orphanClaims}.` : ""}
        </Alert>
      ) : null}

      <ResearchAgentPanel
        projectId={project.projectId}
        onApplied={onChanged}
        onMessage={onMessage}
      />

      <section className="research-metrics-grid" aria-label="Качество исследования">
        {[
          ["Depth", workspace.metrics.depth, "Глубина и проверяемость"],
          ["Confidence", workspace.metrics.confidence, "Сила доказательной базы"],
          ["Impact", workspace.metrics.impact, "Связь с решением"],
        ].map(([label, value, description]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <Progress value={Number(value)} color="brand" size="sm" />
            <small>{description}</small>
          </article>
        ))}
      </section>

      {workspace.metrics.warnings.length ? (
        <Alert color="yellow" icon={<AlertTriangle size={17} />}>
          {workspace.metrics.warnings.join(" · ")}
        </Alert>
      ) : null}

      <details className="research-section" open>
        <summary><span><Flag size={19} /> Паспорт и ближайшее действие</span></summary>
        <form className="research-form-grid" onSubmit={saveOverview}>
          <TextInput required label="Название" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} />
          <Select label="Статус" data={researchProjectStatusOptions} value={draft.status} onChange={(value) => setDraft({ ...draft, status: (value ?? "draft") as ResearchProjectStatus })} />
          <Select label="Дизайн" data={researchDesignOptions} value={draft.design} onChange={(value) => setDraft({ ...draft, design: (value ?? "other") as ResearchDesign })} />
          <TextInput label="Срок" type="date" value={draft.targetDate ?? ""} onChange={(event) => setDraft({ ...draft, targetDate: event.currentTarget.value || null })} />
          <Textarea className="research-form-wide" minRows={2} label="Решение, для которого нужен результат" value={draft.decisionStatement} onChange={(event) => setDraft({ ...draft, decisionStatement: event.currentTarget.value })} />
          <Textarea className="research-form-wide" minRows={2} label="Главный вопрос" value={draft.primaryQuestion} onChange={(event) => setDraft({ ...draft, primaryQuestion: event.currentTarget.value })} />
          <Textarea className="research-form-wide" minRows={3} label="Scope: что входит и что исключается" value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.currentTarget.value })} />
          <Textarea className="research-form-wide" minRows={2} label="Следующее конкретное действие" value={draft.nextAction} onChange={(event) => setDraft({ ...draft, nextAction: event.currentTarget.value })} />
          <Button className="primary-button research-form-wide" leftSection={<Save size={17} />} loading={updateProject.isPending} type="submit">Сохранить паспорт</Button>
        </form>
      </details>

      <details className="research-section" open>
        <summary><span><FileSearch size={19} /> Протокол до начала поиска</span></summary>
        <form className="research-form-grid" onSubmit={saveOverview}>
          <Textarea className="research-form-wide" minRows={3} label="Подвопросы" placeholder="Один проверяемый подвопрос на строку" value={draft.protocol.subQuestions} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, subQuestions: event.currentTarget.value } })} />
          <Textarea minRows={3} label="Рабочие гипотезы" value={draft.protocol.workingHypotheses} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, workingHypotheses: event.currentTarget.value } })} />
          <Textarea minRows={3} label="Альтернативные гипотезы" value={draft.protocol.alternativeHypotheses} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, alternativeHypotheses: event.currentTarget.value } })} />
          <Textarea className="research-form-wide" minRows={2} label="Иерархия источников" placeholder="Официальные и первичные → исследования → вторичные обзоры" value={draft.protocol.sourceHierarchy} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, sourceHierarchy: event.currentTarget.value } })} />
          <Textarea minRows={3} label="Что включать" value={draft.protocol.inclusionCriteria} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, inclusionCriteria: event.currentTarget.value } })} />
          <Textarea minRows={3} label="Что исключать" value={draft.protocol.exclusionCriteria} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, exclusionCriteria: event.currentTarget.value } })} />
          <Textarea minRows={3} label="Правило остановки" placeholder="Когда новых доказательств уже недостаточно, чтобы изменить вывод" value={draft.protocol.stoppingRule} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, stoppingRule: event.currentTarget.value } })} />
          <Textarea minRows={3} label="Что изменит решение" value={draft.protocol.decisionChangeCriteria} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, decisionChangeCriteria: event.currentTarget.value } })} />
          <Textarea className="research-form-wide" minRows={2} label="Этические и правовые ограничения" value={draft.protocol.ethicalConstraints} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, ethicalConstraints: event.currentTarget.value } })} />
          <TextInput label="Перепроверить после" type="date" value={draft.protocol.revisitDate ?? ""} onChange={(event) => setDraft({ ...draft, protocol: { ...draft.protocol, revisitDate: event.currentTarget.value || null } })} />
          <Button className="primary-button research-form-wide" leftSection={<Save size={17} />} loading={updateProject.isPending} type="submit">Сохранить протокол</Button>
        </form>
      </details>

      <details className="research-section" open>
        <summary><span><CheckCircle2 size={19} /> Этапы исследования</span></summary>
        <div className="research-check-list">
          {project.stages.map((stage) => (
            <article key={stage.key} className={stage.status === "blocked" ? "blocked" : ""}>
              <div><strong>{researchStageLabels[stage.key]}</strong><small>Зафиксируй результат или причину блокировки</small></div>
              <TextInput
                aria-label={`Комментарий: ${researchStageLabels[stage.key]}`}
                defaultValue={stage.note}
                placeholder="Результат, ссылка или блокер"
                onBlur={(event) => {
                  if (event.currentTarget.value === stage.note) return;
                  updateProject.mutate({ stages: project.stages.map((item) => item.key === stage.key ? { ...item, note: event.currentTarget.value } : item) });
                }}
              />
              <Select
                aria-label={`Статус: ${researchStageLabels[stage.key]}`}
                data={researchStageStatusOptions}
                value={stage.status}
                onChange={(value) => updateProject.mutate({ stages: project.stages.map((item) => item.key === stage.key ? { ...item, status: (value ?? "pending") as typeof item.status } : item) })}
              />
            </article>
          ))}
        </div>
      </details>

      <details className="research-section">
        <summary><span><CalendarClock size={19} /> Контрольные точки и риски</span></summary>
        <div className="research-control-grid">
          <div>
            <h3>Milestones</h3>
            {project.milestones.map((item) => (
              <article className="research-compact-row" key={item.milestoneId}>
                <button type="button" aria-label="Сменить статус" onClick={() => updateProject.mutate({ milestones: project.milestones.map((milestone) => milestone.milestoneId === item.milestoneId ? { ...milestone, status: milestone.status === "complete" ? "pending" : "complete" } : milestone) })}>{item.status === "complete" ? <CheckCircle2 /> : <CalendarClock />}</button>
                <span><strong>{item.title}</strong><small>{formatDate(item.dueDate)}</small></span>
              </article>
            ))}
            <div className="research-inline-create">
              <TextInput placeholder="Контрольная точка" value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.currentTarget.value)} />
              <TextInput aria-label="Срок контрольной точки" type="date" value={milestoneDate} onChange={(event) => setMilestoneDate(event.currentTarget.value)} />
              <Button type="button" disabled={!milestoneTitle.trim()} onClick={() => { updateProject.mutate({ milestones: [...project.milestones, { milestoneId: createLocalId(), title: milestoneTitle.trim(), dueDate: milestoneDate || null, status: "pending" }] }); setMilestoneTitle(""); setMilestoneDate(""); }}>Добавить</Button>
            </div>
          </div>
          <div>
            <h3>Риски</h3>
            {project.risks.map((item) => (
              <article className="research-compact-row" key={item.riskId}>
                <ShieldAlert />
                <span><strong>{item.title}</strong><small>{item.severity} · {item.status}{item.mitigation ? ` · ${item.mitigation}` : ""}</small></span>
              </article>
            ))}
            <div className="research-inline-create">
              <TextInput placeholder="Новый риск" value={riskTitle} onChange={(event) => setRiskTitle(event.currentTarget.value)} />
              <Button type="button" disabled={!riskTitle.trim()} onClick={() => { updateProject.mutate({ risks: [...project.risks, { riskId: createLocalId(), title: riskTitle.trim(), mitigation: "", severity: "medium", status: "open" }] }); setRiskTitle(""); }}>Добавить</Button>
            </div>
          </div>
        </div>
      </details>

      <details className="research-section" open>
        <summary><span><FileSearch size={19} /> Evidence matrix · {workspace.evidence.length}</span></summary>
        <form className="research-form-grid research-subform" onSubmit={(event) => { event.preventDefault(); createEvidence.mutate(evidenceDraft); }}>
          <TextInput required label="Источник или документ" value={evidenceDraft.title} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, title: event.currentTarget.value })} />
          <TextInput label="Тип источника" placeholder="Статья, эксперимент, логи…" value={evidenceDraft.sourceType} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, sourceType: event.currentTarget.value })} />
          <TextInput className="research-form-wide" label="Ссылка" type="url" value={evidenceDraft.url} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, url: event.currentTarget.value })} />
          <Select label="Происхождение" data={[{ value: "unassessed", label: "Не оценено" }, { value: "primary", label: "Первичный источник / данные" }, { value: "official", label: "Официальный источник" }, { value: "secondary", label: "Вторичный источник" }]} value={evidenceDraft.sourceKind} onChange={(value) => setEvidenceDraft({ ...evidenceDraft, sourceKind: (value ?? "unassessed") as ResearchEvidenceSourceKind })} />
          <Select label="Качество" data={[{ value: "unassessed", label: "Не оценено" }, { value: "low", label: "Низкое" }, { value: "medium", label: "Среднее" }, { value: "high", label: "Высокое" }]} value={evidenceDraft.quality} onChange={(value) => setEvidenceDraft({ ...evidenceDraft, quality: (value ?? "unassessed") as ResearchEvidenceQuality })} />
          <TextInput label="Автор / организация" value={evidenceDraft.author} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, author: event.currentTarget.value })} />
          <TextInput label="Первоначальное происхождение" placeholder="DOI, dataset, документ или origin ID" value={evidenceDraft.originId} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, originId: event.currentTarget.value })} />
          <TextInput label="Дата публикации" type="date" value={evidenceDraft.publishedAt ?? ""} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, publishedAt: event.currentTarget.value || null })} />
          <TextInput label="Дата доступа" type="date" value={evidenceDraft.accessedAt ?? ""} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, accessedAt: event.currentTarget.value || null })} />
          <Select label="Независимость" data={[{ value: "unknown", label: "Не определена" }, { value: "independent", label: "Независимый источник" }, { value: "dependent", label: "Повторяет другой источник" }]} value={evidenceDraft.independence} onChange={(value) => setEvidenceDraft({ ...evidenceDraft, independence: (value ?? "unknown") as ResearchEvidenceIndependence })} />
          <Select label="Актуальность" data={[{ value: "unassessed", label: "Не оценена" }, { value: "current", label: "Актуально" }, { value: "aging", label: "Требует перепроверки" }, { value: "outdated", label: "Устарело" }]} value={evidenceDraft.freshness} onChange={(value) => setEvidenceDraft({ ...evidenceDraft, freshness: (value ?? "unassessed") as ResearchEvidenceFreshness })} />
          <Textarea className="research-form-wide" minRows={2} label="Заметки об источнике, методе и ограничениях" value={evidenceDraft.notes} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, notes: event.currentTarget.value })} />
          <Button className="primary-button research-form-wide" type="submit" loading={createEvidence.isPending}>Добавить доказательство</Button>
        </form>
        <div className="research-record-list">
          {workspace.evidence.map((entry) => (
            <article key={entry.evidenceId}>
              <div>
                <span className="research-record-meta"><Badge variant="light">{entry.sourceKind}</Badge><Badge color={entry.quality === "high" ? "green" : "gray"} variant="light">{entry.quality}</Badge><Badge variant="light">{entry.independence}</Badge><Badge variant="light">{entry.freshness}</Badge></span>
                <strong>{entry.title}</strong>
                {entry.author ? <p>{entry.author}{entry.publishedAt ? ` · ${entry.publishedAt}` : ""}</p> : null}
                <p>{entry.notes || "Описание доказательной роли не заполнено."}</p>
                {entry.originId ? <small>Origin: {entry.originId}</small> : null}
                {entry.url ? <a href={entry.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Открыть источник</a> : null}
              </div>
              <Button color="red" size="xs" variant="subtle" aria-label="Удалить источник" onClick={() => window.confirm("Удалить источник?") && deleteEvidence.mutate(entry.evidenceId)}><Trash2 size={16} /></Button>
            </article>
          ))}
        </div>
      </details>

      <details className="research-section" open>
        <summary><span><FlaskConical size={19} /> Выводы и трассируемость · {workspace.claims.length}</span></summary>
        <form className="research-form-grid research-subform" onSubmit={(event) => { event.preventDefault(); createClaim.mutate(claimDraft); }}>
          <Textarea className="research-form-wide" required minRows={3} label="Что именно утверждаем?" value={claimDraft.text} onChange={(event) => setClaimDraft({ ...claimDraft, text: event.currentTarget.value })} />
          <Select label="Уверенность" data={[{ value: "unassessed", label: "Не оценена" }, { value: "low", label: "Низкая" }, { value: "moderate", label: "Умеренная" }, { value: "high", label: "Высокая" }]} value={claimDraft.confidence} onChange={(value) => setClaimDraft({ ...claimDraft, confidence: (value ?? "unassessed") as ResearchClaimConfidence })} />
          <MultiSelect label="Связанные доказательства" data={evidenceOptions} value={selectedEvidenceIds} onChange={updateSelectedEvidence} searchable />
          {claimDraft.evidenceLinks.length ? (
            <div className="research-form-wide research-evidence-links">
              {claimDraft.evidenceLinks.map((link) => (
                <fieldset key={link.evidenceId}>
                  <legend>{workspace.evidence.find((entry) => entry.evidenceId === link.evidenceId)?.title ?? "Источник"}</legend>
                  <Select label="Роль для этого вывода" data={[{ value: "supports", label: "Поддерживает" }, { value: "contradicts", label: "Противоречит" }, { value: "limits", label: "Ограничивает" }, { value: "context", label: "Даёт контекст" }]} value={link.stance} onChange={(value) => updateEvidenceLink(link.evidenceId, { stance: (value ?? "supports") as ResearchEvidenceRelationStance })} />
                  <TextInput label="Страница / раздел" value={link.locator} onChange={(event) => updateEvidenceLink(link.evidenceId, { locator: event.currentTarget.value })} />
                  <Textarea className="research-form-wide" minRows={2} label="Цитата или точный фрагмент" value={link.excerpt} onChange={(event) => updateEvidenceLink(link.evidenceId, { excerpt: event.currentTarget.value })} />
                  <Textarea className="research-form-wide" minRows={2} label="Что именно доказывает связь" value={link.notes} onChange={(event) => updateEvidenceLink(link.evidenceId, { notes: event.currentTarget.value })} />
                </fieldset>
              ))}
            </div>
          ) : null}
          <Textarea className="research-form-wide" minRows={2} label="Альтернативные объяснения" value={claimDraft.alternativeExplanations} onChange={(event) => setClaimDraft({ ...claimDraft, alternativeExplanations: event.currentTarget.value })} />
          <Textarea className="research-form-wide" minRows={2} label="Неопределённость и границы применимости" value={claimDraft.uncertainty} onChange={(event) => setClaimDraft({ ...claimDraft, uncertainty: event.currentTarget.value })} />
          <Button className="primary-button research-form-wide" type="submit" loading={createClaim.isPending}>Добавить вывод</Button>
        </form>
        <div className="research-record-list">
          {workspace.claims.map((claim) => (
            <article className={claim.evidenceIds.length || claim.evidenceLinks.length ? "" : "warning"} key={claim.claimId}>
              <div>
                <span className="research-record-meta"><Badge variant="light">{claim.confidence}</Badge><Badge color={claim.evidenceIds.length || claim.evidenceLinks.length ? "green" : "yellow"} variant="light">Источников: {claim.evidenceLinks.length || claim.evidenceIds.length}</Badge></span>
                <strong>{claim.text}</strong>
                {claim.evidenceLinks.map((link) => (
                  <div className="research-claim-link" key={link.evidenceId}>
                    <Badge variant="light">{link.stance}</Badge>
                    <span><b>{workspace.evidence.find((entry) => entry.evidenceId === link.evidenceId)?.title ?? "Удалённый источник"}</b>{link.locator ? ` · ${link.locator}` : ""}</span>
                    {link.verified !== undefined ? (
                      <Badge color={link.verified ? "green" : "red"} variant="light">
                        {link.verified ? `Проверено${link.entailmentScore !== undefined ? ` · ${link.entailmentScore}` : ""}` : "Не подтверждено"}
                      </Badge>
                    ) : null}
                    {link.excerpt ? <q>{link.excerpt}</q> : null}
                    {link.notes ? <small>{link.notes}</small> : null}
                    {link.auditNote ? <small><b>Audit:</b> {link.auditNote}</small> : null}
                  </div>
                ))}
                {claim.alternativeExplanations ? <p><b>Альтернативы:</b> {claim.alternativeExplanations}</p> : null}
                {claim.uncertainty ? <p><b>Неопределённость:</b> {claim.uncertainty}</p> : null}
              </div>
              <Button color="red" size="xs" variant="subtle" aria-label="Удалить вывод" onClick={() => window.confirm("Удалить вывод?") && deleteClaim.mutate(claim.claimId)}><Trash2 size={16} /></Button>
            </article>
          ))}
        </div>
      </details>

      <details className="research-section" open>
        <summary><span><Bot size={19} /> Действия из исследований · {workspace.actions.length}</span></summary>
        <p className="research-section-note">Это подтверждённые изменения. Отметь выполненное или отклони предложение — статический учебный план агент сам не переписывает.</p>
        <div className="research-record-list research-action-list">
          {workspace.actions.map((action) => (
            <article key={action.actionId}>
              <div>
                <span className="research-record-meta">
                  <Badge variant="light">{action.type}</Badge>
                  <Badge color={action.status === "completed" ? "green" : action.status === "rejected" ? "red" : "yellow"} variant="light">{action.status}</Badge>
                  <Badge variant="light">P{action.priority}</Badge>
                </span>
                <strong>{action.title}</strong>
                <p>{action.reason}</p>
                <small><b>Ожидаемый результат:</b> {action.expectedOutcome}</small>
                {action.payload.details ? <p>{action.payload.details}</p> : null}
              </div>
              <div className="research-action-buttons">
                <Button size="xs" variant="light" disabled={action.status === "completed"} onClick={() => updateActionStatus.mutate({ actionId: action.actionId, status: "completed" })}>Готово</Button>
                <Button color="red" size="xs" variant="subtle" disabled={action.status === "rejected"} onClick={() => updateActionStatus.mutate({ actionId: action.actionId, status: "rejected" })}>Отклонить</Button>
              </div>
            </article>
          ))}
          {!workspace.actions.length ? <p className="research-section-note">Подтверждённых действий пока нет.</p> : null}
        </div>
      </details>

      <details className="research-section" open>
        <summary><span><ShieldAlert size={19} /> Quality gate</span></summary>
        <p className="research-section-note">Критические дефекты нельзя компенсировать количеством обычных галочек.</p>
        <div className="research-check-list research-gate-list">
          {project.qualityGates.map((gate) => (
            <article key={gate.key} className={gate.status === "blocked" ? "blocked" : ""}>
              <div><strong>{researchGateLabels[gate.key]}</strong><small>{criticalResearchGates.has(gate.key) ? "Критическая проверка" : "Контроль качества"}</small></div>
              <TextInput
                aria-label={`Комментарий проверки: ${researchGateLabels[gate.key]}`}
                defaultValue={gate.note}
                placeholder="Основание решения"
                onBlur={(event) => {
                  if (event.currentTarget.value === gate.note) return;
                  updateProject.mutate({ qualityGates: project.qualityGates.map((item) => item.key === gate.key ? { ...item, note: event.currentTarget.value } : item) });
                }}
              />
              <Select aria-label={`Проверка: ${researchGateLabels[gate.key]}`} data={researchGateStatusOptions} value={gate.status} onChange={(value) => updateProject.mutate({ qualityGates: project.qualityGates.map((item) => item.key === gate.key ? { ...item, status: (value ?? "pending") as typeof item.status } : item) })} />
            </article>
          ))}
        </div>
      </details>

      <Button className="secondary-button danger" leftSection={<Trash2 size={17} />} type="button" variant="default" onClick={onDelete}>Удалить исследование</Button>
    </div>
  );
}

interface ResearchAgentPanelProps {
  projectId: string;
  onApplied: () => Promise<void>;
  onMessage: (message: string) => void;
}

const activeAgentStatuses = new Set<ResearchAgentRun["status"]>(["queued", "running"]);
const reviewableAgentStatuses = new Set<ResearchAgentRun["status"]>([
  "review_ready",
  "partially_completed",
]);

const researchAgentTypeOptions: Array<{ value: ResearchAgentType; label: string }> = [
  { value: "technical_topic", label: "Техническая тема" },
  { value: "company_interview", label: "Собеседование в компанию" },
  { value: "vacancy", label: "Конкретная вакансия" },
  { value: "learning_method", label: "Метод обучения" },
  { value: "post_interview", label: "Разбор собеседования" },
];

const researchAgentModeOptions: Array<{ value: ResearchAgentMode; label: string }> = [
  { value: "quick", label: "Quick · узкий вопрос" },
  { value: "standard", label: "Standard · с red-team" },
  { value: "deep", label: "Deep · повторный поиск пробелов" },
];

function ResearchAgentPanel({
  projectId,
  onApplied,
  onMessage,
}: ResearchAgentPanelProps) {
  const queryClient = useQueryClient();
  const queryKey = ["research-agent-run", projectId] as const;
  const runQuery = useQuery({
    queryKey,
    queryFn: () => learningApi.getLatestResearchAgentRun(projectId),
    refetchInterval: (query) =>
      query.state.data && activeAgentStatuses.has(query.state.data.status) ? 2_000 : false,
  });
  const run = runQuery.data;
  const [agentType, setAgentType] = useState<ResearchAgentType>("technical_topic");
  const [agentMode, setAgentMode] = useState<ResearchAgentMode>("standard");
  const [includeProtocol, setIncludeProtocol] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [initializedRunId, setInitializedRunId] = useState<string | null>(null);
  const selectionInitialized = Boolean(run && initializedRunId === run.runId);
  const defaultEvidence = run?.draft.evidence.map((entry) => entry.candidateId) ?? [];
  const defaultClaims = run?.draft.claims.map((claim) => claim.candidateId) ?? [];
  const defaultActions = run?.draft.actions
    .filter((action) => action.type !== "NO_ACTION")
    .map((action) => action.candidateId) ?? [];
  const effectiveIncludeProtocol = selectionInitialized ? includeProtocol : true;
  const effectiveEvidence = selectionInitialized ? selectedEvidence : defaultEvidence;
  const effectiveClaims = selectionInitialized ? selectedClaims : defaultClaims;
  const effectiveActions = selectionInitialized ? selectedActions : defaultActions;

  const refreshRun = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };
  const startRun = useMutation({
    mutationFn: () => learningApi.startResearchAgentRun(projectId, {
      operationId: createLocalId(),
      type: agentType,
      mode: agentMode,
    }),
    onSuccess: refreshRun,
    onError: (error: Error) => onMessage(error.message),
  });
  const cancelRun = useMutation({
    mutationFn: (runId: string) => learningApi.cancelResearchAgentRun(projectId, runId),
    onSuccess: refreshRun,
    onError: (error: Error) => onMessage(error.message),
  });
  const applyRun = useMutation({
    mutationFn: (runId: string) => learningApi.applyResearchAgentRun(projectId, runId, {
      operationId: createLocalId(),
      includeProtocol: effectiveIncludeProtocol,
      evidenceCandidateIds: effectiveEvidence,
      claimCandidateIds: effectiveClaims,
      actionCandidateIds: effectiveActions,
    }),
    onSuccess: async () => {
      await Promise.all([refreshRun(), onApplied()]);
    },
    onError: (error: Error) => onMessage(error.message),
  });

  const active = Boolean(run && activeAgentStatuses.has(run.status));
  return (
    <section className="research-agent-panel">
      <div className="research-agent-heading">
        <div>
          <p className="eyebrow">Autonomous research agent</p>
          <h2><Bot size={24} /> Глубокое исследование</h2>
          <p>Агент планирует поиск, собирает evidence, ищет опровержения и отдаёт черновик на твоё подтверждение.</p>
        </div>
        <div className="research-agent-launch">
          <Select
            label="Тип"
            data={researchAgentTypeOptions}
            value={agentType}
            disabled={active}
            onChange={(value) => setAgentType((value ?? "technical_topic") as ResearchAgentType)}
          />
          <Select
            label="Глубина"
            data={researchAgentModeOptions}
            value={agentMode}
            disabled={active}
            onChange={(value) => setAgentMode((value ?? "standard") as ResearchAgentMode)}
          />
          <Button
            className="primary-button"
            leftSection={<Bot size={18} />}
            loading={startRun.isPending}
            disabled={active}
            onClick={() => startRun.mutate()}
          >
            {run ? "Запустить заново" : "Запустить исследование"}
          </Button>
        </div>
      </div>

      {run ? (
        <div className="research-agent-run">
          <div className="research-agent-status">
            <span><Badge variant="light">{run.status}</Badge><b>{run.phase}</b></span>
            <strong>{run.progress}%</strong>
          </div>
          <Progress value={run.progress} color="brand" size="md" animated={active} />
          <small>
            {run.type} · {run.mode} · AI-вызовы {run.usage.modelCalls}/{run.budget.maximumModelCalls}
            {` · Sol ${run.usage.solCalls}/${run.budget.maximumSolCalls}`}
            {` · источники ${run.usage.sourcesAccepted}/${run.budget.maximumSources}`}
          </small>
          {run.logs.length ? (
            <ol className="research-agent-log">
              {run.logs.slice(-5).map((entry, index) => (
                <li key={`${entry.at}-${index}`}><span>{entry.phase}</span>{entry.message}</li>
              ))}
            </ol>
          ) : null}
          {active ? (
            <Button
              color="red"
              leftSection={<XCircle size={17} />}
              loading={cancelRun.isPending}
              variant="light"
              onClick={() => cancelRun.mutate(run.runId)}
            >
              Остановить
            </Button>
          ) : null}
          {run.error ? <Alert color="red">{run.error}</Alert> : null}

          {reviewableAgentStatuses.has(run.status) ? (
            <div className="research-agent-review">
              <div>
                <h3>Черновик готов</h3>
                <p>{run.draft.summary}</p>
                <small><b>Почему поиск остановлен:</b> {run.draft.stopReason || "Агент не указал правило остановки"}</small>
              </div>
              {run.draft.unresolvedGaps.length ? (
                <Alert color="yellow">Остались пробелы: {run.draft.unresolvedGaps.join(" · ")}</Alert>
              ) : null}
              <div className="research-agent-audit-summary">
                <Badge color="green" variant="light">
                  Проверено связей: {run.draft.citationAudits.filter((entry) => entry.verified).length}
                </Badge>
                <Badge color={run.draft.contradictions.some((entry) => entry.status === "unresolved") ? "red" : "gray"} variant="light">
                  Противоречий: {run.draft.contradictions.length}
                </Badge>
                <Badge variant="light">Действий: {run.draft.actions.length}</Badge>
              </div>
              {run.draft.contradictions.length ? (
                <div className="research-agent-contradictions">
                  {run.draft.contradictions.map((entry) => (
                    <article key={entry.candidateId}>
                      <Badge color={entry.status === "unresolved" ? "red" : "yellow"} variant="light">{entry.status}</Badge>
                      <strong>{entry.claimA}</strong>
                      <span>↔ {entry.claimB}</span>
                      <p>{entry.explanation}</p>
                      {entry.impact ? <small>Влияние: {entry.impact}</small> : null}
                    </article>
                  ))}
                </div>
              ) : null}
              <Checkbox
                checked={effectiveIncludeProtocol}
                label="Применить предложенный протокол"
                onChange={(event) => {
                  setInitializedRunId(run.runId);
                  setIncludeProtocol(event.currentTarget.checked);
                  if (!selectionInitialized) {
                    setSelectedEvidence(defaultEvidence);
                    setSelectedClaims(defaultClaims);
                    setSelectedActions(defaultActions);
                  }
                }}
              />
              <Checkbox.Group
                label={`Источники · ${run.draft.evidence.length}`}
                value={effectiveEvidence}
                onChange={(value) => {
                  setInitializedRunId(run.runId);
                  setSelectedEvidence(value);
                  if (!selectionInitialized) {
                    setIncludeProtocol(true);
                    setSelectedClaims(defaultClaims);
                    setSelectedActions(defaultActions);
                  }
                }}
              >
                <div className="research-agent-options">
                  {run.draft.evidence.map((entry) => (
                    <Checkbox
                      key={entry.candidateId}
                      value={entry.candidateId}
                      label={`${entry.title} · ${entry.sourceKind} · ${entry.quality}`}
                    />
                  ))}
                </div>
              </Checkbox.Group>
              <Checkbox.Group
                label={`Выводы · ${run.draft.claims.length}`}
                value={effectiveClaims}
                onChange={(value) => {
                  setInitializedRunId(run.runId);
                  setSelectedClaims(value);
                  if (!selectionInitialized) {
                    setIncludeProtocol(true);
                    setSelectedEvidence(defaultEvidence);
                    setSelectedActions(defaultActions);
                  }
                }}
              >
                <div className="research-agent-options">
                  {run.draft.claims.map((claim) => (
                    <Checkbox
                      key={claim.candidateId}
                      value={claim.candidateId}
                      label={`${claim.text} · уверенность ${claim.confidence}`}
                    />
                  ))}
                </div>
              </Checkbox.Group>
              {run.draft.actions.length ? (
                <Checkbox.Group
                  label={`Предлагаемые изменения · ${run.draft.actions.length}`}
                  value={effectiveActions}
                  onChange={(value) => {
                    setInitializedRunId(run.runId);
                    setSelectedActions(value);
                    if (!selectionInitialized) {
                      setIncludeProtocol(true);
                      setSelectedEvidence(defaultEvidence);
                      setSelectedClaims(defaultClaims);
                    }
                  }}
                >
                  <div className="research-agent-action-options">
                    {run.draft.actions.map((action) => (
                      <article key={action.candidateId}>
                        <Checkbox
                          value={action.candidateId}
                          disabled={action.type === "NO_ACTION"}
                          label={`${action.type} · приоритет ${action.priority}`}
                        />
                        <strong>{action.title}</strong>
                        <p>{action.reason}</p>
                        <small><b>После подтверждения:</b> {action.payload.details || action.expectedOutcome}</small>
                      </article>
                    ))}
                  </div>
                </Checkbox.Group>
              ) : null}
              <Button
                className="primary-button"
                loading={applyRun.isPending}
                disabled={!effectiveIncludeProtocol && !effectiveEvidence.length && !effectiveClaims.length && !effectiveActions.length}
                onClick={() => applyRun.mutate(run.runId)}
              >
                Применить выбранное
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="research-section-note">Агент ничего не изменяет без подтверждения результата.</p>
      )}
    </section>
  );
}
