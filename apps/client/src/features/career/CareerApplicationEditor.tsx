import { useState, type FormEvent } from "react";
import {
  Button,
  Modal,
  NumberInput,
  Select,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Bot, CalendarPlus, ExternalLink, Play, Save, Target, Trash2 } from "lucide-react";

import {
  careerInterviewTypeLabels,
  careerStageLabels,
  careerStageOrder,
} from "./career";
import type {
  CareerApplication,
  CareerInterviewStatus,
  CareerInterviewType,
  CareerPipelineStage,
  CareerPriority,
  CreateCareerInterview,
  UpdateCareerApplication,
  UpdateCareerInterview,
} from "../../types";

interface CareerApplicationEditorProps {
  application: CareerApplication;
  opened: boolean;
  saving: boolean;
  analyzing: boolean;
  creatingTarget: boolean;
  startingMock: boolean;
  onClose: () => void;
  onCreateInterview: (data: CreateCareerInterview) => void;
  onDelete: () => void;
  onDeleteInterview: (interviewId: string) => void;
  onSave: (data: UpdateCareerApplication) => void;
  onAnalyze: () => void;
  onCreateTarget: (input: {
    company: string;
    role: string;
    level: string;
    description: string;
    interviewAt: string | null;
  }) => void;
  onStartMock: () => void;
  onUpdateInterview: (interviewId: string, data: UpdateCareerInterview) => void;
}

const emptyInterview: CreateCareerInterview = {
  type: "recruiter",
  status: "planned",
  scheduledAt: null,
  format: "",
  participants: "",
  questions: [],
  notes: "",
  outcome: "",
  nextAction: "",
};

const asNumber = (value: string | number) =>
  typeof value === "number" ? value : Number(value) || 0;

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("ru-RU") : "Дата не назначена";

export function CareerApplicationEditor({
  application,
  opened,
  saving,
  analyzing,
  creatingTarget,
  startingMock,
  onClose,
  onCreateInterview,
  onDelete,
  onDeleteInterview,
  onSave,
  onAnalyze,
  onCreateTarget,
  onStartMock,
  onUpdateInterview,
}: CareerApplicationEditorProps) {
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [draft, setDraft] = useState(application);
  const [stackText, setStackText] = useState(application.stack.join(", "));
  const [interview, setInterview] = useState(emptyInterview);
  const [questionsText, setQuestionsText] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      company: draft.company,
      role: draft.role,
      url: draft.url,
      source: draft.source,
      description: draft.description,
      priority: draft.priority,
      stage: draft.stage,
      fitScore: draft.fitScore,
      salary: draft.salary,
      workFormat: draft.workFormat,
      level: draft.level,
      stack: stackText.split(",").map((item) => item.trim()).filter(Boolean),
      recruiterName: draft.recruiterName,
      recruiterContact: draft.recruiterContact,
      hiringManagerName: draft.hiringManagerName,
      hiringManagerContact: draft.hiringManagerContact,
      publishedAt: draft.publishedAt,
      appliedAt: draft.appliedAt,
      followUpAt: draft.followUpAt,
      nextAction: draft.nextAction,
      rejectionReason: draft.rejectionReason,
      notes: draft.notes,
    });
  }

  function submitInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateInterview({
      ...interview,
      questions: questionsText.split("\n").map((item) => item.trim()).filter(Boolean),
    });
    setInterview(emptyInterview);
    setQuestionsText("");
  }

  return (
    <Modal
      fullScreen={Boolean(isMobile)}
      opened={opened}
      size="min(980px, calc(100vw - 32px))"
      title={`${application.company} · ${application.role}`}
      onClose={onClose}
    >
      <div className="career-editor-stack">
        <form className="career-form-grid" onSubmit={submit}>
          <TextInput required label="Компания" value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.currentTarget.value })} />
          <TextInput required label="Вакансия" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.currentTarget.value })} />
          <Select label="Этап" data={careerStageOrder.map((value) => ({ value, label: careerStageLabels[value] }))} value={draft.stage} onChange={(value) => setDraft({ ...draft, stage: (value ?? "saved") as CareerPipelineStage })} />
          <Select label="Приоритет" data={[{ value: "high", label: "Высокий" }, { value: "medium", label: "Средний" }, { value: "low", label: "Низкий" }]} value={draft.priority} onChange={(value) => setDraft({ ...draft, priority: (value ?? "medium") as CareerPriority })} />
          <NumberInput label="Соответствие, %" min={0} max={100} value={draft.fitScore} onChange={(value) => setDraft({ ...draft, fitScore: asNumber(value) })} />
          <TextInput label="Уровень" placeholder="Middle+, Senior" value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.currentTarget.value })} />
          <TextInput label="Источник" value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.currentTarget.value })} />
          <TextInput label="Формат" placeholder="Удалённо, гибрид" value={draft.workFormat} onChange={(event) => setDraft({ ...draft, workFormat: event.currentTarget.value })} />
          <TextInput label="Зарплата" value={draft.salary} onChange={(event) => setDraft({ ...draft, salary: event.currentTarget.value })} />
          <TextInput label="Стек через запятую" value={stackText} onChange={(event) => setStackText(event.currentTarget.value)} />
          <TextInput className="career-form-wide" label="Ссылка" type="url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.currentTarget.value })} />
          <Textarea className="career-form-wide" minRows={8} label="Полный текст вакансии" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })} />
          <TextInput label="Дата публикации" type="date" value={draft.publishedAt ?? ""} onChange={(event) => setDraft({ ...draft, publishedAt: event.currentTarget.value || null })} />
          <TextInput label="Дата отклика" type="date" value={draft.appliedAt ?? ""} onChange={(event) => setDraft({ ...draft, appliedAt: event.currentTarget.value || null })} />
          <TextInput label="Follow-up" type="date" value={draft.followUpAt ?? ""} onChange={(event) => setDraft({ ...draft, followUpAt: event.currentTarget.value || null })} />
          <TextInput label="Рекрутер" value={draft.recruiterName} onChange={(event) => setDraft({ ...draft, recruiterName: event.currentTarget.value })} />
          <TextInput label="Контакт рекрутера" value={draft.recruiterContact} onChange={(event) => setDraft({ ...draft, recruiterContact: event.currentTarget.value })} />
          <TextInput label="Нанимающий менеджер" value={draft.hiringManagerName} onChange={(event) => setDraft({ ...draft, hiringManagerName: event.currentTarget.value })} />
          <TextInput label="Контакт менеджера" value={draft.hiringManagerContact} onChange={(event) => setDraft({ ...draft, hiringManagerContact: event.currentTarget.value })} />
          <Textarea className="career-form-wide" minRows={2} label="Следующее действие" value={draft.nextAction} onChange={(event) => setDraft({ ...draft, nextAction: event.currentTarget.value })} />
          {draft.stage === "rejected" ? <Textarea className="career-form-wide" minRows={2} label="Причина отказа" value={draft.rejectionReason} onChange={(event) => setDraft({ ...draft, rejectionReason: event.currentTarget.value })} /> : null}
          <Textarea className="career-form-wide" minRows={4} label="Заметки" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.currentTarget.value })} />
          <div className="career-form-wide career-editor-actions">
            <Button className="primary-button" leftSection={<Save size={17} />} loading={saving} type="submit">Сохранить</Button>
            <Button leftSection={<Bot size={17} />} loading={analyzing} type="button" variant="default" onClick={onAnalyze}>Разобрать вакансию</Button>
            <Button
              disabled={!draft.description.trim()}
              leftSection={<Target size={17} />}
              loading={creatingTarget}
              type="button"
              variant="default"
              onClick={() => onCreateTarget({
                company: draft.company,
                role: draft.role,
                level: draft.level,
                description: draft.description,
                interviewAt: draft.interviews.find((item) => item.status === "planned")?.scheduledAt ?? null,
              })}
            >
              Создать цель v8
            </Button>
            <Button leftSection={<Play size={17} />} loading={startingMock} type="button" variant="default" onClick={onStartMock}>Мок по вакансии</Button>
            {draft.url ? <Button component="a" href={draft.url} target="_blank" rel="noreferrer" leftSection={<ExternalLink size={17} />} variant="default">Открыть вакансию</Button> : null}
            <Button color="red" leftSection={<Trash2 size={17} />} type="button" variant="subtle" onClick={onDelete}>Удалить</Button>
          </div>
        </form>

        {application.analysis ? (
          <section className="career-analysis-panel">
            <div className="section-heading">
              <div><p className="eyebrow">AI-рекрутер · {application.analysis.model}</p><h2>{application.analysis.fitScore}% соответствия</h2></div>
            </div>
            <p>{application.analysis.summary}</p>
            <div className="career-analysis-grid">
              <article><strong>Что совпадает</strong>{application.analysis.matchedRequirements.map((item) => <span key={item}>{item}</span>)}</article>
              <article><strong>Пробелы</strong>{application.analysis.gaps.map((gap) => <span key={gap.requirement} data-severity={gap.severity}>{gap.requirement} — {gap.action}</span>)}</article>
              <article><strong>Вероятные вопросы</strong>{application.analysis.likelyInterviewTopics.map((item) => <span key={item}>{item}</span>)}</article>
              <article><strong>Что сделать</strong>{application.analysis.preparationActions.map((item) => <span key={item}>{item}</span>)}</article>
            </div>
          </section>
        ) : null}

        <section className="career-interview-section">
          <div className="section-heading"><div><p className="eyebrow">История этапов</p><h2>Собеседования</h2></div></div>
          <div className="career-interview-list">
            {application.interviews.map((item) => (
              <article key={item.interviewId}>
                <div>
                  <strong>{careerInterviewTypeLabels[item.type]}</strong>
                  <span>{formatDateTime(item.scheduledAt)}{item.format ? ` · ${item.format}` : ""}</span>
                  {item.questions.length ? <p><b>Вопросы:</b> {item.questions.join(" · ")}</p> : null}
                  {item.notes ? <p>{item.notes}</p> : null}
                  {item.outcome ? <p><b>Результат:</b> {item.outcome}</p> : null}
                </div>
                <div className="career-interview-actions">
                  <Select
                    aria-label="Статус собеседования"
                    data={[{ value: "planned", label: "Запланировано" }, { value: "completed", label: "Завершено" }, { value: "cancelled", label: "Отменено" }]}
                    value={item.status}
                    onChange={(value) => onUpdateInterview(item.interviewId, { status: (value ?? "planned") as CareerInterviewStatus })}
                  />
                  <Button color="red" size="xs" variant="subtle" onClick={() => onDeleteInterview(item.interviewId)}><Trash2 size={15} /></Button>
                </div>
              </article>
            ))}
          </div>

          <form className="career-form-grid career-interview-form" onSubmit={submitInterview}>
            <Select label="Тип этапа" data={Object.entries(careerInterviewTypeLabels).map(([value, label]) => ({ value, label }))} value={interview.type} onChange={(value) => setInterview({ ...interview, type: (value ?? "recruiter") as CareerInterviewType })} />
            <TextInput label="Дата и время" type="datetime-local" value={interview.scheduledAt ?? ""} onChange={(event) => setInterview({ ...interview, scheduledAt: event.currentTarget.value || null })} />
            <TextInput label="Формат" placeholder="Zoom, офис, звонок" value={interview.format} onChange={(event) => setInterview({ ...interview, format: event.currentTarget.value })} />
            <TextInput label="Участники" value={interview.participants} onChange={(event) => setInterview({ ...interview, participants: event.currentTarget.value })} />
            <Textarea className="career-form-wide" minRows={3} label="Вопросы — по одному на строку" value={questionsText} onChange={(event) => setQuestionsText(event.currentTarget.value)} />
            <Textarea className="career-form-wide" minRows={3} label="Заметки и что улучшить" value={interview.notes} onChange={(event) => setInterview({ ...interview, notes: event.currentTarget.value })} />
            <Textarea className="career-form-wide" minRows={2} label="Результат" value={interview.outcome} onChange={(event) => setInterview({ ...interview, outcome: event.currentTarget.value })} />
            <Textarea className="career-form-wide" minRows={2} label="Следующее действие" value={interview.nextAction} onChange={(event) => setInterview({ ...interview, nextAction: event.currentTarget.value })} />
            <Button className="primary-button career-form-wide" leftSection={<CalendarPlus size={17} />} type="submit">Добавить этап</Button>
          </form>
        </section>
      </div>
    </Modal>
  );
}
