import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Loader,
  NumberInput,
  Progress,
  Select,
  Tabs,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  Plus,
  Send,
  Target,
  Trash2,
} from "lucide-react";

import { learningApi } from "../../api";
import type {
  CareerActivityType,
  CareerPipelineStage,
  CareerPriority,
  CareerSearchMode,
  CareerWeeklyGoals,
  CreateCareerActivity,
  CreateCareerApplication,
  CreateCareerInterview,
  UpdateCareerApplication,
  UpdateCareerInterview,
} from "../../types";
import { CareerApplicationEditor } from "./CareerApplicationEditor";
import { CareerPlaybook } from "./CareerPlaybook";
import {
  CAREER_QUERY_KEY,
  careerActivityLabels,
  careerStageLabels,
  careerStageOrder,
  getCareerAnalytics,
  getDueCareerApplications,
  getUpcomingCareerInterviews,
  getWeeklyCareerActivity,
  searchModeGoals,
  searchModeLabels,
} from "./career";

const emptyApplication: CreateCareerApplication = {
  company: "",
  role: "Frontend Developer",
  url: "",
  source: "",
  description: "",
  priority: "medium",
  stage: "saved",
  fitScore: 0,
  salary: "",
  workFormat: "",
  level: "",
  stack: [],
  recruiterName: "",
  recruiterContact: "",
  hiringManagerName: "",
  hiringManagerContact: "",
  publishedAt: null,
  appliedAt: null,
  followUpAt: null,
  nextAction: "",
  rejectionReason: "",
  notes: "",
};

const goalLabels: Record<keyof CareerWeeklyGoals, string> = {
  applications: "Отклики",
  outreach: "Прямые сообщения",
  referrals: "Рекомендации",
  interviews: "Собеседования",
};

const priorityLabels: Record<CareerPriority, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

const formatDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU") : "Без даты";

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("ru-RU") : "Дата не назначена";

const asNumber = (value: string | number) =>
  typeof value === "number" ? value : Number(value) || 0;

interface CareerViewProps {
  onOpenInterview?: () => void;
}

export function CareerView({ onOpenInterview }: CareerViewProps) {
  const queryClient = useQueryClient();
  const workspace = useQuery({
    queryKey: CAREER_QUERY_KEY,
    queryFn: learningApi.getCareerWorkspace,
  });
  const [message, setMessage] = useState("");
  const [applicationDraft, setApplicationDraft] = useState(emptyApplication);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [activityDraft, setActivityDraft] = useState<CreateCareerActivity>({
    applicationId: null,
    type: "application",
    occurredAt: new Date().toISOString(),
    note: "",
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: CAREER_QUERY_KEY });
  const handleError = (error: Error) => setMessage(error.message);

  const createApplication = useMutation({
    mutationFn: learningApi.createCareerApplication,
    onSuccess: async (application, variables) => {
      if (variables.stage === "applied") {
        await learningApi.createCareerActivity({
          applicationId: application.applicationId,
          type: "application",
          occurredAt: new Date().toISOString(),
          note: `${application.company} · ${application.role}`,
        });
      }
      setApplicationDraft(emptyApplication);
      await refresh();
    },
    onError: handleError,
  });
  const updateApplication = useMutation({
    mutationFn: ({ applicationId, data }: { applicationId: string; data: UpdateCareerApplication }) =>
      learningApi.updateCareerApplication(applicationId, data),
    onSuccess: refresh,
    onError: handleError,
  });
  const deleteApplication = useMutation({
    mutationFn: learningApi.deleteCareerApplication,
    onSuccess: async () => { setSelectedApplicationId(null); await refresh(); },
    onError: handleError,
  });
  const analyzeApplication = useMutation({
    mutationFn: learningApi.analyzeCareerApplication,
    onSuccess: refresh,
    onError: handleError,
  });
  const createTargetProfile = useMutation({
    mutationFn: (application: {
      company: string;
      role: string;
      level: string;
      description: string;
      interviewAt: string | null;
    }) => {
      return learningApi.createTargetProfileV2({
        vacancyText: application.description,
        company: application.company,
        role: application.role,
        seniority: application.level || null,
        interviewAt: application.interviewAt,
      });
    },
    onSuccess: async (target) => {
      setMessage(`Профиль подготовки «${target.label}» создан. Он доступен в разделе «Знания».`);
      await queryClient.invalidateQueries({ queryKey: ["target-profiles-v2"] });
    },
    onError: handleError,
  });
  const startVacancyMock = useMutation({
    mutationFn: (applicationId: string) =>
      learningApi.startInterviewSession("full", "general", "training", applicationId),
    onSuccess: () => onOpenInterview?.(),
    onError: handleError,
  });
  const createInterview = useMutation({
    mutationFn: ({ applicationId, data }: { applicationId: string; data: CreateCareerInterview }) =>
      learningApi.createCareerInterview(applicationId, data),
    onSuccess: refresh,
    onError: handleError,
  });
  const updateInterview = useMutation({
    mutationFn: ({ applicationId, interviewId, data }: { applicationId: string; interviewId: string; data: UpdateCareerInterview }) =>
      learningApi.updateCareerInterview(applicationId, interviewId, data),
    onSuccess: refresh,
    onError: handleError,
  });
  const deleteInterview = useMutation({
    mutationFn: ({ applicationId, interviewId }: { applicationId: string; interviewId: string }) =>
      learningApi.deleteCareerInterview(applicationId, interviewId),
    onSuccess: refresh,
    onError: handleError,
  });
  const createActivity = useMutation({
    mutationFn: learningApi.createCareerActivity,
    onSuccess: async () => {
      setActivityDraft({ applicationId: null, type: "application", occurredAt: new Date().toISOString(), note: "" });
      await refresh();
    },
    onError: handleError,
  });
  const deleteActivity = useMutation({
    mutationFn: learningApi.deleteCareerActivity,
    onSuccess: refresh,
    onError: handleError,
  });
  const updateSettings = useMutation({
    mutationFn: learningApi.updateCareerSettings,
    onSuccess: refresh,
    onError: handleError,
  });

  if (workspace.isPending || !workspace.data) {
    return <div className="view-loader"><Loader color="mint" size="sm" /> Загружаю поиск работы…</div>;
  }

  const data = workspace.data;
  const analytics = getCareerAnalytics(data.applications);
  const weekly = getWeeklyCareerActivity(data.activities);
  const dueApplications = getDueCareerApplications(data.applications);
  const upcomingInterviews = getUpcomingCareerInterviews(data.applications);
  const selectedApplication = data.applications.find(
    (item) => item.applicationId === selectedApplicationId,
  );
  const applicationOptions = data.applications.map((item) => ({
    value: item.applicationId,
    label: `${item.company} · ${item.role}`,
  }));

  return (
    <div className="page-stack career-page">
      <header className="page-header career-header">
        <div>
          <p className="eyebrow">Career control center</p>
          <h1>Поиск работы под контролем</h1>
          <p>Вакансии, follow-up, собеседования и недельные действия в одной воронке.</p>
        </div>
        <div className="header-stat"><BriefcaseBusiness size={20} /><strong>{analytics.active}</strong><span>активных вакансий</span></div>
      </header>

      {message ? <Alert color="red" icon={<AlertTriangle size={17} />}>{message}</Alert> : null}

      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List className="career-tabs">
          <Tabs.Tab value="overview">Сегодня</Tabs.Tab>
          <Tabs.Tab value="pipeline">Воронка</Tabs.Tab>
          <Tabs.Tab value="analytics">Аналитика</Tabs.Tab>
          <Tabs.Tab value="strategy">Стратегия</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <div className="career-tab-stack">
            <section className="career-metric-grid">
              <article><BriefcaseBusiness /><strong>{analytics.total}</strong><span>всего вакансий</span></article>
              <article><Send /><strong>{analytics.applied}</strong><span>откликов</span></article>
              <article><CalendarClock /><strong>{analytics.withInterviews}</strong><span>дошли до интервью</span></article>
              <article><CircleDollarSign /><strong>{analytics.offers}</strong><span>офферов</span></article>
            </section>

            <section className="career-panel">
              <div className="section-heading"><div><p className="eyebrow">Недельный ритм</p><h2>{searchModeLabels[data.settings.searchMode]}</h2></div><Target /></div>
              <div className="career-goal-grid">
                {(Object.keys(goalLabels) as Array<keyof CareerWeeklyGoals>).map((key) => {
                  const goal = data.settings.weeklyGoals[key];
                  const actual = weekly[key];
                  return (
                    <article key={key}>
                      <div><strong>{goalLabels[key]}</strong><span>{actual} / {goal}</span></div>
                      <Progress color={actual >= goal ? "green" : "mint"} value={goal ? Math.min(100, Math.round((actual / goal) * 100)) : 100} />
                    </article>
                  );
                })}
              </div>
              <CareerSettingsForm
                key={data.settings.updatedAt}
                settings={data.settings}
                saving={updateSettings.isPending}
                onSave={(searchMode, weeklyGoals, strategyNotes, candidateProfile) =>
                  updateSettings.mutate({
                    searchMode,
                    weeklyGoals,
                    strategyNotes,
                    candidateProfile,
                  })
                }
              />
            </section>

            <section className="career-overview-grid">
              <article className="career-panel">
                <div className="section-heading"><div><p className="eyebrow">Требуют внимания</p><h2>Follow-up</h2></div><CalendarClock /></div>
                <div className="career-action-list">
                  {dueApplications.length ? dueApplications.map((item) => (
                    <button key={item.applicationId} type="button" onClick={() => setSelectedApplicationId(item.applicationId)}>
                      <span><strong>{item.company}</strong><small>{item.role} · {formatDate(item.followUpAt)}</small></span><ArrowRight />
                    </button>
                  )) : <p>Просроченных follow-up нет.</p>}
                </div>
              </article>
              <article className="career-panel">
                <div className="section-heading"><div><p className="eyebrow">Ближайшие 14 дней</p><h2>Собеседования</h2></div><CalendarClock /></div>
                <div className="career-action-list">
                  {upcomingInterviews.length ? upcomingInterviews.map(({ application, interview }) => (
                    <button key={interview.interviewId} type="button" onClick={() => setSelectedApplicationId(application.applicationId)}>
                      <span><strong>{application.company}</strong><small>{formatDateTime(interview.scheduledAt)} · {application.role}</small></span><ArrowRight />
                    </button>
                  )) : <p>Ближайших интервью пока нет.</p>}
                </div>
              </article>
            </section>

            <section className="career-panel">
              <div className="section-heading"><div><p className="eyebrow">Самоконтроль</p><h2>Зафиксировать действие</h2></div><Activity /></div>
              <form className="career-activity-form" onSubmit={(event) => { event.preventDefault(); createActivity.mutate({ ...activityDraft, occurredAt: new Date().toISOString() }); }}>
                <Select label="Что сделал" data={Object.entries(careerActivityLabels).map(([value, label]) => ({ value, label }))} value={activityDraft.type} onChange={(value) => setActivityDraft({ ...activityDraft, type: (value ?? "other") as CareerActivityType })} />
                <Select clearable searchable label="Вакансия" data={applicationOptions} value={activityDraft.applicationId} onChange={(applicationId) => setActivityDraft({ ...activityDraft, applicationId })} />
                <TextInput label="Короткая заметка" value={activityDraft.note} onChange={(event) => setActivityDraft({ ...activityDraft, note: event.currentTarget.value })} />
                <Button className="primary-button" loading={createActivity.isPending} type="submit">Записать</Button>
              </form>
              <div className="career-activity-list">
                {data.activities.slice(0, 10).map((activity) => (
                  <article key={activity.activityId}>
                    <span><strong>{careerActivityLabels[activity.type]}</strong><small>{new Date(activity.occurredAt).toLocaleString("ru-RU")}{activity.note ? ` · ${activity.note}` : ""}</small></span>
                    <Button color="red" size="xs" variant="subtle" onClick={() => deleteActivity.mutate(activity.activityId)}><Trash2 size={14} /></Button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="pipeline">
          <div className="career-tab-stack">
            <section className="career-panel">
              <div className="section-heading"><div><p className="eyebrow">Новая возможность</p><h2>Добавить вакансию</h2></div><Plus /></div>
              <form className="career-create-form" onSubmit={(event) => { event.preventDefault(); createApplication.mutate(applicationDraft); }}>
                <TextInput required label="Компания" value={applicationDraft.company} onChange={(event) => setApplicationDraft({ ...applicationDraft, company: event.currentTarget.value })} />
                <TextInput required label="Вакансия" value={applicationDraft.role} onChange={(event) => setApplicationDraft({ ...applicationDraft, role: event.currentTarget.value })} />
                <Select label="Этап" data={careerStageOrder.slice(0, 2).map((value) => ({ value, label: careerStageLabels[value] }))} value={applicationDraft.stage} onChange={(value) => setApplicationDraft({ ...applicationDraft, stage: (value ?? "saved") as CareerPipelineStage, appliedAt: value === "applied" ? new Date().toISOString().slice(0, 10) : null })} />
                <Select label="Приоритет" data={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))} value={applicationDraft.priority} onChange={(value) => setApplicationDraft({ ...applicationDraft, priority: (value ?? "medium") as CareerPriority })} />
                <NumberInput label="Соответствие, %" min={0} max={100} value={applicationDraft.fitScore} onChange={(value) => setApplicationDraft({ ...applicationDraft, fitScore: asNumber(value) })} />
                <TextInput label="Источник" value={applicationDraft.source} onChange={(event) => setApplicationDraft({ ...applicationDraft, source: event.currentTarget.value })} />
                <TextInput className="career-form-wide" label="Ссылка" type="url" value={applicationDraft.url} onChange={(event) => setApplicationDraft({ ...applicationDraft, url: event.currentTarget.value })} />
                <Textarea className="career-form-wide" minRows={6} label="Текст вакансии" value={applicationDraft.description} onChange={(event) => setApplicationDraft({ ...applicationDraft, description: event.currentTarget.value })} />
                <Textarea className="career-form-wide" minRows={2} label="Следующее действие" value={applicationDraft.nextAction} onChange={(event) => setApplicationDraft({ ...applicationDraft, nextAction: event.currentTarget.value })} />
                <Button className="primary-button career-form-wide" loading={createApplication.isPending} type="submit">Добавить в воронку</Button>
              </form>
            </section>

            <div className="career-pipeline">
              {careerStageOrder.map((stage) => {
                const applications = data.applications.filter((item) => item.stage === stage);
                return (
                  <section key={stage} className="career-pipeline-column">
                    <header><strong>{careerStageLabels[stage]}</strong><Badge variant="light">{applications.length}</Badge></header>
                    <div>
                      {applications.map((item) => (
                        <article key={item.applicationId} className={`priority-${item.priority}`}>
                          <button type="button" onClick={() => setSelectedApplicationId(item.applicationId)}>
                            <span><strong>{item.company}</strong><small>{item.role}</small></span><ArrowRight size={17} />
                          </button>
                          <div className="career-card-meta"><span>{item.fitScore}% fit</span><span>{priorityLabels[item.priority]}</span></div>
                          {item.nextAction ? <p>{item.nextAction}</p> : null}
                          <Select aria-label={`Этап ${item.company}`} data={careerStageOrder.map((value) => ({ value, label: careerStageLabels[value] }))} size="xs" value={item.stage} onChange={(value) => updateApplication.mutate({ applicationId: item.applicationId, data: { stage: (value ?? item.stage) as CareerPipelineStage } })} />
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="analytics">
          <div className="career-tab-stack">
            <section className="career-metric-grid career-analytics-grid">
              <article><BarChart3 /><strong>{analytics.interviewConversion}%</strong><span>от отклика до интервью</span></article>
              <article><CircleDollarSign /><strong>{analytics.offerConversion}%</strong><span>от отклика до оффера</span></article>
              <article><CalendarClock /><strong>{analytics.withInterviews}</strong><span>компаний с интервью</span></article>
              <article><AlertTriangle /><strong>{analytics.rejected}</strong><span>отказов</span></article>
            </section>
            <section className="career-panel">
              <div className="section-heading"><div><p className="eyebrow">Диагностика</p><h2>Когда менять стратегию</h2></div><BarChart3 /></div>
              <div className="career-diagnostic-grid">
                <article><strong>Мало просмотров после 20–30 откликов</strong><p>Перепроверь заголовок, первые строки резюме, уровень вакансий и соответствие ключевому стеку.</p></article>
                <article><strong>Есть просмотры, но нет HR</strong><p>Усиль достижения и объясни фактический Middle+/ownership несмотря на формальный title.</p></article>
                <article><strong>Есть HR, но нет технических</strong><p>Проверь рассказ о себе, зарплатную вилку, мотивацию и ясность примеров ответственности.</p></article>
                <article><strong>Есть технические, но нет финалов</strong><p>Разбирай вопросы после каждого этапа и тренируй защиту решений, коммуникацию и системность.</p></article>
              </div>
            </section>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="strategy"><CareerPlaybook /></Tabs.Panel>
      </Tabs>

      {selectedApplication ? (
        <CareerApplicationEditor
          key={selectedApplication.updatedAt}
          application={selectedApplication}
          opened
          saving={updateApplication.isPending}
          analyzing={analyzeApplication.isPending}
          creatingTarget={createTargetProfile.isPending}
          startingMock={startVacancyMock.isPending}
          onClose={() => setSelectedApplicationId(null)}
          onSave={(data) => updateApplication.mutate({ applicationId: selectedApplication.applicationId, data })}
          onAnalyze={() => analyzeApplication.mutate(selectedApplication.applicationId)}
          onCreateTarget={(input) => createTargetProfile.mutate(input)}
          onStartMock={() => startVacancyMock.mutate(selectedApplication.applicationId)}
          onDelete={() => window.confirm("Удалить вакансию и историю интервью?") && deleteApplication.mutate(selectedApplication.applicationId)}
          onCreateInterview={(data) => createInterview.mutate({ applicationId: selectedApplication.applicationId, data })}
          onUpdateInterview={(interviewId, data) => updateInterview.mutate({ applicationId: selectedApplication.applicationId, interviewId, data })}
          onDeleteInterview={(interviewId) => window.confirm("Удалить запись собеседования?") && deleteInterview.mutate({ applicationId: selectedApplication.applicationId, interviewId })}
        />
      ) : null}
    </div>
  );
}

interface CareerSettingsFormProps {
  settings: {
    searchMode: CareerSearchMode;
    weeklyGoals: CareerWeeklyGoals;
    strategyNotes: string;
    candidateProfile: string;
  };
  saving: boolean;
  onSave: (
    searchMode: CareerSearchMode,
    weeklyGoals: CareerWeeklyGoals,
    strategyNotes: string,
    candidateProfile: string,
  ) => void;
}

function CareerSettingsForm({ settings, saving, onSave }: CareerSettingsFormProps) {
  const [searchMode, setSearchMode] = useState(settings.searchMode);
  const [weeklyGoals, setWeeklyGoals] = useState(settings.weeklyGoals);
  const [strategyNotes, setStrategyNotes] = useState(settings.strategyNotes);
  const [candidateProfile, setCandidateProfile] = useState(settings.candidateProfile);

  function changeMode(value: string | null) {
    const mode = (value ?? "working") as CareerSearchMode;
    setSearchMode(mode);
    setWeeklyGoals(searchModeGoals[mode]);
  }

  return (
    <details className="career-settings-details">
      <summary>Настроить режим и цели</summary>
      <div className="career-settings-grid">
        <Select label="Режим поиска" data={Object.entries(searchModeLabels).map(([value, label]) => ({ value, label }))} value={searchMode} onChange={changeMode} />
        {(Object.keys(goalLabels) as Array<keyof CareerWeeklyGoals>).map((key) => (
          <NumberInput key={key} label={goalLabels[key]} min={0} max={100} value={weeklyGoals[key]} onChange={(value) => setWeeklyGoals({ ...weeklyGoals, [key]: asNumber(value) })} />
        ))}
        <Textarea className="career-form-wide" minRows={3} label="Личная стратегия и ограничения" value={strategyNotes} onChange={(event) => setStrategyNotes(event.currentTarget.value)} />
        <Textarea className="career-form-wide" minRows={6} label="Профиль кандидата для AI-разбора" placeholder="Опыт, проекты, сильные стороны и реальные ограничения — без приукрашивания" value={candidateProfile} onChange={(event) => setCandidateProfile(event.currentTarget.value)} />
        <Button className="primary-button career-form-wide" loading={saving} type="button" onClick={() => onSave(searchMode, weeklyGoals, strategyNotes, candidateProfile)}>Сохранить цели</Button>
      </div>
    </details>
  );
}
