import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Progress, Select, Textarea, TextInput } from "@mantine/core";
import { AlertTriangle, FlaskConical, Plus } from "lucide-react";

import {
  researchDesignOptions,
  researchProjectStatusOptions,
} from "../../lib/research";
import type {
  CreateResearchProject,
  ResearchDesign,
  ResearchProject,
} from "../../types";

interface ResearchProjectListProps {
  creating: boolean;
  message: string;
  projects: ResearchProject[];
  onCreate: (project: CreateResearchProject) => void;
  onOpenProject: (projectId: string) => void;
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
  protocol: {
    subQuestions: "",
    workingHypotheses: "",
    alternativeHypotheses: "",
    sourceHierarchy: "",
    inclusionCriteria: "",
    exclusionCriteria: "",
    stoppingRule: "",
    decisionChangeCriteria: "",
    ethicalConstraints: "",
    revisitDate: null,
  },
};

const formatDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU") : "Без срока";

export function ResearchProjectList({
  creating,
  message,
  projects,
  onCreate,
  onOpenProject,
}: ResearchProjectListProps) {
  const [draft, setDraft] = useState(emptyProject);

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate(draft);
  }

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
          <TextInput required label="Название" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} />
          <Select label="Дизайн" data={researchDesignOptions} value={draft.design} onChange={(value) => setDraft({ ...draft, design: (value ?? "other") as ResearchDesign })} />
          <Textarea className="research-form-wide" required minRows={2} label="Главный вопрос" value={draft.primaryQuestion} onChange={(event) => setDraft({ ...draft, primaryQuestion: event.currentTarget.value })} />
          <Textarea className="research-form-wide" minRows={2} label="Для какого решения нужен результат?" value={draft.decisionStatement} onChange={(event) => setDraft({ ...draft, decisionStatement: event.currentTarget.value })} />
          <TextInput type="date" label="Начало" value={draft.startDate ?? ""} onChange={(event) => setDraft({ ...draft, startDate: event.currentTarget.value || null })} />
          <TextInput type="date" label="Целевой срок" value={draft.targetDate ?? ""} onChange={(event) => setDraft({ ...draft, targetDate: event.currentTarget.value || null })} />
          <Button className="primary-button research-form-wide" leftSection={<Plus size={17} />} loading={creating} type="submit">Создать проект</Button>
        </form>
      </section>
    </div>
  );
}
