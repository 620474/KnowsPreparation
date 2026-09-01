import { useMemo, useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
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
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Flag,
  FlaskConical,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { learningApi } from "../api";
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
  CreateResearchProject,
  ResearchClaimConfidence,
  ResearchEvidenceQuality,
  ResearchEvidenceStance,
  ResearchProjectStatus,
  ResearchDesign,
  ResearchWorkspace,
  UpdateResearchProject,
} from "../types";

const workspaceKey = (projectId: string) => ["research-workspace", projectId] as const;

interface ResearchViewProps {
  projectId: string | null;
  onOpenProject: (projectId: string | null) => void;
}

const emptyProject: CreateResearchProject = {
  title: "",
  decisionStatement: "",
  primaryQuestion: "",
  scope: "",
  design: "other",
  status: "draft",
  startDate: null,
  targetDate: null,
  nextAction: "",
};

const emptyEvidence: CreateResearchEvidence = {
  title: "",
  url: "",
  sourceType: "",
  stance: "neutral",
  quality: "unassessed",
  notes: "",
};

const emptyClaim: CreateResearchClaim = {
  text: "",
  status: "draft",
  confidence: "unassessed",
  evidenceIds: [],
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
  const [createDraft, setCreateDraft] = useState(emptyProject);
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
      setCreateDraft(emptyProject);
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

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    createProject.mutate(createDraft);
  }

  if (projectId) {
    if (workspaceQuery.isPending || !workspaceQuery.data) {
      return <div className="view-loader"><Loader color="mint" size="sm" /> Загружаю исследование…</div>;
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
    <div className="page-stack research-page">
      <header className="page-header research-header">
        <div>
          <p className="eyebrow">Research control center</p>
          <h1>Исследования под контролем</h1>
          <p>От вопроса и протокола до проверяемого вывода и воспроизводимого отчёта.</p>
        </div>
        <div className="header-stat"><FlaskConical size={20} /><strong>{projects.length}</strong><span>проектов</span></div>
      </header>

      {message ? <Alert color="red" icon={<AlertTriangle size={17} />}>{message}</Alert> : null}

      <section className="research-project-grid">
        {projects.map((project) => {
          const complete = project.stages.filter((stage) =>
            stage.status === "complete" || stage.status === "not_applicable"
          ).length;
          const progress = Math.round((complete / project.stages.length) * 100);
          const blocked = project.qualityGates.filter((gate) => gate.status === "blocked").length;
          return (
            <button key={project.projectId} type="button" onClick={() => onOpenProject(project.projectId)}>
              <span className="research-project-card-top">
                <Badge color={project.status === "active" ? "green" : "gray"} variant="light">
                  {researchProjectStatusOptions.find((item) => item.value === project.status)?.label}
                </Badge>
                <small>{formatDate(project.targetDate)}</small>
              </span>
              <strong>{project.title}</strong>
              <p>{project.primaryQuestion || project.decisionStatement || "Добавь главный исследовательский вопрос."}</p>
              <Progress color={blocked ? "red" : "mint"} value={progress} size="sm" />
              <span className="research-project-card-bottom">
                <small>{complete} из {project.stages.length} этапов</small>
                <small>{blocked ? `${blocked} блокера` : project.nextAction || "Нет следующего действия"}</small>
              </span>
            </button>
          );
        })}
      </section>

      <section className="research-form-card">
        <div className="section-heading">
          <div><p className="eyebrow">Новый проект</p><h2>Зафиксировать исследование</h2></div>
        </div>
        <form className="research-form-grid" onSubmit={submitProject}>
          <TextInput required label="Название" value={createDraft.title} onChange={(event) => setCreateDraft({ ...createDraft, title: event.currentTarget.value })} />
          <Select label="Дизайн" data={researchDesignOptions} value={createDraft.design} onChange={(value) => setCreateDraft({ ...createDraft, design: (value ?? "other") as ResearchDesign })} />
          <Textarea className="research-form-wide" required minRows={2} label="Главный вопрос" value={createDraft.primaryQuestion} onChange={(event) => setCreateDraft({ ...createDraft, primaryQuestion: event.currentTarget.value })} />
          <Textarea className="research-form-wide" minRows={2} label="Для какого решения нужен результат?" value={createDraft.decisionStatement} onChange={(event) => setCreateDraft({ ...createDraft, decisionStatement: event.currentTarget.value })} />
          <TextInput type="date" label="Начало" value={createDraft.startDate ?? ""} onChange={(event) => setCreateDraft({ ...createDraft, startDate: event.currentTarget.value || null })} />
          <TextInput type="date" label="Целевой срок" value={createDraft.targetDate ?? ""} onChange={(event) => setCreateDraft({ ...createDraft, targetDate: event.currentTarget.value || null })} />
          <Button className="primary-button research-form-wide" leftSection={<Plus size={17} />} loading={createProject.isPending} type="submit">Создать проект</Button>
        </form>
      </section>
    </div>
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

  const completedStages = project.stages.filter((stage) =>
    stage.status === "complete" || stage.status === "not_applicable"
  ).length;
  const progress = Math.round((completedStages / project.stages.length) * 100);
  const blockedGates = project.qualityGates.filter((gate) => gate.status === "blocked");
  const orphanClaims = workspace.claims.filter((claim) => claim.evidenceIds.length === 0).length;
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
    });
  }

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
          <Progress color={blockedGates.length ? "red" : "mint"} value={progress} size="sm" />
        </div>
      </header>

      {message ? <Alert color="red" icon={<AlertTriangle size={17} />}>{message}</Alert> : null}
      {blockedGates.length || orphanClaims ? (
        <Alert color="yellow" icon={<ShieldAlert size={18} />}>
          {blockedGates.length ? `Критических проблем: ${blockedGates.length}. ` : ""}
          {orphanClaims ? `Выводов без доказательств: ${orphanClaims}.` : ""}
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
          <Select label="Роль" data={[{ value: "supports", label: "Поддерживает" }, { value: "contradicts", label: "Противоречит" }, { value: "neutral", label: "Контекст" }]} value={evidenceDraft.stance} onChange={(value) => setEvidenceDraft({ ...evidenceDraft, stance: (value ?? "neutral") as ResearchEvidenceStance })} />
          <Select label="Качество" data={[{ value: "unassessed", label: "Не оценено" }, { value: "low", label: "Низкое" }, { value: "medium", label: "Среднее" }, { value: "high", label: "Высокое" }]} value={evidenceDraft.quality} onChange={(value) => setEvidenceDraft({ ...evidenceDraft, quality: (value ?? "unassessed") as ResearchEvidenceQuality })} />
          <Textarea className="research-form-wide" minRows={2} label="Что именно это доказывает и чего не доказывает" value={evidenceDraft.notes} onChange={(event) => setEvidenceDraft({ ...evidenceDraft, notes: event.currentTarget.value })} />
          <Button className="primary-button research-form-wide" type="submit" loading={createEvidence.isPending}>Добавить доказательство</Button>
        </form>
        <div className="research-record-list">
          {workspace.evidence.map((entry) => (
            <article key={entry.evidenceId}>
              <div>
                <span className="research-record-meta"><Badge variant="light">{entry.stance}</Badge><Badge color={entry.quality === "high" ? "green" : "gray"} variant="light">{entry.quality}</Badge></span>
                <strong>{entry.title}</strong>
                <p>{entry.notes || "Описание доказательной роли не заполнено."}</p>
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
          <MultiSelect label="Связанные доказательства" data={evidenceOptions} value={claimDraft.evidenceIds} onChange={(evidenceIds) => setClaimDraft({ ...claimDraft, evidenceIds })} searchable />
          <Textarea className="research-form-wide" minRows={2} label="Альтернативные объяснения" value={claimDraft.alternativeExplanations} onChange={(event) => setClaimDraft({ ...claimDraft, alternativeExplanations: event.currentTarget.value })} />
          <Textarea className="research-form-wide" minRows={2} label="Неопределённость и границы применимости" value={claimDraft.uncertainty} onChange={(event) => setClaimDraft({ ...claimDraft, uncertainty: event.currentTarget.value })} />
          <Button className="primary-button research-form-wide" type="submit" loading={createClaim.isPending}>Добавить вывод</Button>
        </form>
        <div className="research-record-list">
          {workspace.claims.map((claim) => (
            <article className={claim.evidenceIds.length ? "" : "warning"} key={claim.claimId}>
              <div>
                <span className="research-record-meta"><Badge variant="light">{claim.confidence}</Badge><Badge color={claim.evidenceIds.length ? "green" : "yellow"} variant="light">Источников: {claim.evidenceIds.length}</Badge></span>
                <strong>{claim.text}</strong>
                {claim.alternativeExplanations ? <p><b>Альтернативы:</b> {claim.alternativeExplanations}</p> : null}
                {claim.uncertainty ? <p><b>Неопределённость:</b> {claim.uncertainty}</p> : null}
              </div>
              <Button color="red" size="xs" variant="subtle" aria-label="Удалить вывод" onClick={() => window.confirm("Удалить вывод?") && deleteClaim.mutate(claim.claimId)}><Trash2 size={16} /></Button>
            </article>
          ))}
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
