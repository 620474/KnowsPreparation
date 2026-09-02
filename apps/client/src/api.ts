import {
  adaptivePlanSchema,
  aiLessonSchema,
  careerActivitySchema,
  careerApplicationSchema,
  careerSettingsSchema,
  careerWorkspaceSchema,
  interviewSessionSchema,
  readinessCalibrationSummarySchema,
  readinessOutcomeSchema,
  readinessPredictionSnapshotSchema,
  knowledgeOverviewSchema,
  learningAnalyticsSchema,
  learningMissionSchema,
  learningMissionsTodaySchema,
  practiceAttemptHistorySchema,
  practiceAttemptSchema,
  practiceSolutionSaveResultSchema,
  questionAttemptResultSchema,
  skillDetailSchema,
  skillGraphSchema,
  transferAssessmentResultSchema,
  researchClaimSchema,
  researchEvidenceSchema,
  researchProjectSchema,
  researchWorkspaceSchema,
  researchAgentRunSchema,
  researchActionSchema,
  yandexPlatformMockAttemptSchema,
} from "@prep/contracts";
import { z } from "zod";
import {
  mergeBootstrapPayloads,
  parseBootstrapContent,
  parseBootstrapProgress,
} from "./lib/bootstrap";
import type {
  AlgorithmEntry,
  AdaptivePlan,
  AdaptivePlanCheckIn,
  AiCourse,
  AiCourseProfile,
  AiChatHistory,
  AiChatMessage,
  AiLesson,
  Difficulty,
  LessonQuizProgress,
  LearningAnalytics,
  LearningMission,
  LearningMissionAction,
  LearningMissionsToday,
  KnowledgeOverview,
  SkillDetail,
  SkillGraph,
  LearningBackup,
  InterviewSession,
  InterviewSessionCompany,
  InterviewSessionKind,
  InterviewSessionMode,
  ReadinessCalibrationSummary,
  ReadinessOutcome,
  ReadinessPredictionSnapshot,
  MockInterview,
  PracticeSolutionSaveResult,
  PracticeAttempt,
  PracticeAttemptHistory,
  PracticeAttemptSource,
  PracticeAttemptTelemetry,
  QuestionProgress,
  QuestionAttemptResult,
  ReviewRating,
  TaskProgress,
  TaskProgressPatch,
  TrackKey,
  TransferAssessmentResult,
  YandexMockDayId,
  YandexMockVerdict,
  YandexPlatformMockAttempt,
  AppSettings,
  SettingsPatch,
  CreateResearchProject,
  UpdateResearchProject,
  ResearchProject,
  CreateResearchEvidence,
  UpdateResearchEvidence,
  ResearchEvidence,
  CreateResearchClaim,
  UpdateResearchClaim,
  ResearchClaim,
  ResearchWorkspace,
  ResearchAgentRun,
  ResearchAction,
  ResearchActionStatus,
  StartResearchAgentRun,
  ApplyResearchAgentRun,
  CareerApplication,
  CareerSettings,
  CareerWorkspace,
  CreateCareerApplication,
  UpdateCareerApplication,
  CreateCareerInterview,
  UpdateCareerInterview,
  UpdateCareerSettings,
  CareerActivity,
  CreateCareerActivity,
} from "./types";
import { SseParser } from "./lib/sse";

/** Все ресурсы трека живут под одним префиксом, поэтому путь один для всех. */
const trackItemPath = (track: TrackKey, itemId: string) =>
  `/learning/tracks/${track}/items/${encodeURIComponent(itemId)}`;

const interviewSessionPath = (interviewId: string) =>
  `/learning/interview-sessions/${encodeURIComponent(interviewId)}`;

const API_URL_KEY = "prep-api-url";
const TOKEN_KEY = "prep-auth-token";
export const UNAUTHORIZED_EVENT = "prep:unauthorized";

export const DEFAULT_API_URL = normalizeApiUrl(
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1",
);

export function getApiUrl() {
  const stored = localStorage.getItem(API_URL_KEY);
  if (!stored) return DEFAULT_API_URL;
  const migrated = normalizeApiUrl(stored);
  if (migrated !== stored) localStorage.setItem(API_URL_KEY, migrated);
  return migrated;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

export function normalizeApiUrl(url: string) {
  const normalized = url.trim().replace(/\/+$/, "");
  return normalized.endsWith("/api") ? `${normalized}/v1` : normalized;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new Error(message ?? `Ошибка сервера: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function streamRequest<T>(
  path: string,
  init: RequestInit,
  onDelta: (delta: string) => void,
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new Error(message ?? `Ошибка сервера: ${response.status}`);
  }
  if (!response.body) throw new Error("Сервер не открыл поток ответа");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  let result: T | undefined;
  const handleEvents = (events: ReturnType<SseParser["push"]>) => {
    for (const event of events) {
      const data: unknown = JSON.parse(event.data);
      if (
        event.event === "delta" &&
        typeof data === "object" &&
        data !== null &&
        "delta" in data &&
        typeof data.delta === "string"
      ) {
        onDelta(data.delta);
      } else if (event.event === "result") {
        result = data as T;
      } else if (event.event === "error") {
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : "AI-поток прерван";
        throw new Error(message);
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    handleEvents(parser.push(decoder.decode(value, { stream: true })));
  }
  handleEvents(parser.push(decoder.decode()));
  handleEvents(parser.finish());
  if (result === undefined) throw new Error("Сервер завершил поток без результата");
  return result;
}

export async function login(apiUrl: string, password: string) {
  const normalizedUrl = normalizeApiUrl(apiUrl);
  const response = await fetch(`${normalizedUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Не удалось подключиться к API");
  }

  const data = (await response.json()) as { token: string };
  localStorage.setItem(API_URL_KEY, normalizedUrl);
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export const learningApi = {
  bootstrap: () =>
    Promise.all([
      request<unknown>("/learning/bootstrap/content").then(parseBootstrapContent),
      request<unknown>("/learning/bootstrap/progress").then(parseBootstrapProgress),
    ]).then(([content, progress]) => mergeBootstrapPayloads(content, progress)),
  getAdaptiveToday: () =>
    request<AdaptivePlan>("/learning/adaptive/today").then((result) =>
      adaptivePlanSchema.parse(result),
    ),
  generateAdaptiveToday: (checkIn: AdaptivePlanCheckIn) =>
    request<AdaptivePlan>("/learning/adaptive/today/generate", {
      method: "POST",
      body: JSON.stringify(checkIn),
    }).then((result) => adaptivePlanSchema.parse(result)),
  skipAdaptiveRecommendation: (recommendationId: string, operationId: string) =>
    request<{ skipped: boolean }>("/learning/adaptive/today/skip", {
      method: "POST",
      body: JSON.stringify({ recommendationId, operationId }),
    }),
  getMissionsToday: (target = "general") =>
    request<LearningMissionsToday>(`/learning/missions/today?target=${encodeURIComponent(target)}`).then(
      (result) => learningMissionsTodaySchema.parse(result),
    ),
  getMission: (missionId: string) =>
    request<LearningMission>(`/learning/missions/${encodeURIComponent(missionId)}`).then(
      (result) => learningMissionSchema.parse(result),
    ),
  updateMission: (
    missionId: string,
    input: {
      action: LearningMissionAction;
      operationId: string;
      deferredUntil?: string;
      note?: string;
    },
  ) => request<LearningMission>(`/learning/missions/${encodeURIComponent(missionId)}/actions`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((result) => learningMissionSchema.parse(result)),
  submitTransferAssessment: (
    missionId: string,
    input: { answer: string; confidence: number; responseTimeMs: number; operationId: string },
  ) => request<TransferAssessmentResult>(
    `/learning/missions/${encodeURIComponent(missionId)}/transfer-attempts`,
    { method: "POST", body: JSON.stringify(input) },
  ).then((result) => transferAssessmentResultSchema.parse(result)),
  getLearningAnalytics: (days: 7 | 30) =>
    request<LearningAnalytics>(`/learning/analytics?days=${days}`).then((result) =>
      learningAnalyticsSchema.parse(result),
    ),
  getSkillGraph: () =>
    request<SkillGraph>("/learning/knowledge/skills").then((result) =>
      skillGraphSchema.parse(result),
    ),
  getKnowledgeOverview: (target = "general") =>
    request<KnowledgeOverview>(`/learning/knowledge/overview?target=${encodeURIComponent(target)}`).then(
      (result) => knowledgeOverviewSchema.parse(result),
    ),
  getSkillDetail: (skillId: string) =>
    request<SkillDetail>(`/learning/knowledge/skills/${encodeURIComponent(skillId)}`).then(
      (result) => skillDetailSchema.parse(result),
    ),
  listResearchProjects: () =>
    request<ResearchProject[]>("/learning/research/projects").then((projects) =>
      projects.map((project) => researchProjectSchema.parse(project)),
    ),
  getResearchWorkspace: (projectId: string) =>
    request<ResearchWorkspace>(
      `/learning/research/projects/${encodeURIComponent(projectId)}`,
    ).then((workspace) => researchWorkspaceSchema.parse(workspace)),
  createResearchProject: (data: CreateResearchProject) =>
    request<ResearchProject>("/learning/research/projects", {
      method: "POST",
      body: JSON.stringify({ data }),
    }).then((project) => researchProjectSchema.parse(project)),
  updateResearchProject: (projectId: string, data: UpdateResearchProject) =>
    request<ResearchProject>(
      `/learning/research/projects/${encodeURIComponent(projectId)}`,
      { method: "PATCH", body: JSON.stringify({ data }) },
    ).then((project) => researchProjectSchema.parse(project)),
  deleteResearchProject: (projectId: string) =>
    request<{ deleted: boolean }>(
      `/learning/research/projects/${encodeURIComponent(projectId)}`,
      { method: "DELETE" },
    ),
  createResearchEvidence: (projectId: string, data: CreateResearchEvidence) =>
    request<ResearchEvidence>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/evidence`,
      { method: "POST", body: JSON.stringify({ data }) },
    ).then((entry) => researchEvidenceSchema.parse(entry)),
  updateResearchEvidence: (
    projectId: string,
    evidenceId: string,
    data: UpdateResearchEvidence,
  ) =>
    request<ResearchEvidence>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/evidence/${encodeURIComponent(evidenceId)}`,
      { method: "PATCH", body: JSON.stringify({ data }) },
    ).then((entry) => researchEvidenceSchema.parse(entry)),
  deleteResearchEvidence: (projectId: string, evidenceId: string) =>
    request<{ deleted: boolean }>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/evidence/${encodeURIComponent(evidenceId)}`,
      { method: "DELETE" },
    ),
  createResearchClaim: (projectId: string, data: CreateResearchClaim) =>
    request<ResearchClaim>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/claims`,
      { method: "POST", body: JSON.stringify({ data }) },
    ).then((claim) => researchClaimSchema.parse(claim)),
  updateResearchClaim: (
    projectId: string,
    claimId: string,
    data: UpdateResearchClaim,
  ) =>
    request<ResearchClaim>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/claims/${encodeURIComponent(claimId)}`,
      { method: "PATCH", body: JSON.stringify({ data }) },
    ).then((claim) => researchClaimSchema.parse(claim)),
  deleteResearchClaim: (projectId: string, claimId: string) =>
    request<{ deleted: boolean }>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/claims/${encodeURIComponent(claimId)}`,
      { method: "DELETE" },
    ),
  getLatestResearchAgentRun: (projectId: string) =>
    request<ResearchAgentRun | null>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/agent-runs/latest`,
    ).then((run) => run ? researchAgentRunSchema.parse(run) : null),
  startResearchAgentRun: (projectId: string, data: StartResearchAgentRun) =>
    request<ResearchAgentRun>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/agent-runs`,
      { method: "POST", body: JSON.stringify({ data }) },
    ).then((run) => researchAgentRunSchema.parse(run)),
  cancelResearchAgentRun: (projectId: string, runId: string) =>
    request<ResearchAgentRun>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/agent-runs/${encodeURIComponent(runId)}/cancel`,
      { method: "POST" },
    ).then((run) => researchAgentRunSchema.parse(run)),
  applyResearchAgentRun: (
    projectId: string,
    runId: string,
    data: ApplyResearchAgentRun,
  ) =>
    request<ResearchWorkspace>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/agent-runs/${encodeURIComponent(runId)}/apply`,
      { method: "POST", body: JSON.stringify({ data }) },
    ).then((workspace) => researchWorkspaceSchema.parse(workspace)),
  updateResearchActionStatus: (
    projectId: string,
    actionId: string,
    status: ResearchActionStatus,
  ) =>
    request<ResearchAction>(
      `/learning/research/projects/${encodeURIComponent(projectId)}/actions/${encodeURIComponent(actionId)}`,
      { method: "PATCH", body: JSON.stringify({ data: { status } }) },
    ).then((action) => researchActionSchema.parse(action)),
  getCareerWorkspace: () =>
    request<CareerWorkspace>("/career").then((workspace) =>
      careerWorkspaceSchema.parse(workspace),
    ),
  createCareerApplication: (data: CreateCareerApplication) =>
    request<CareerApplication>("/career/applications", {
      method: "POST",
      body: JSON.stringify({ data }),
    }).then((application) => careerApplicationSchema.parse(application)),
  updateCareerApplication: (
    applicationId: string,
    data: UpdateCareerApplication,
  ) =>
    request<CareerApplication>(
      `/career/applications/${encodeURIComponent(applicationId)}`,
      { method: "PATCH", body: JSON.stringify({ data }) },
    ).then((application) => careerApplicationSchema.parse(application)),
  deleteCareerApplication: (applicationId: string) =>
    request<{ deleted: boolean }>(
      `/career/applications/${encodeURIComponent(applicationId)}`,
      { method: "DELETE" },
    ),
  analyzeCareerApplication: (applicationId: string) =>
    request<CareerApplication>(
      `/career/applications/${encodeURIComponent(applicationId)}/analyze`,
      { method: "POST" },
    ).then((application) => careerApplicationSchema.parse(application)),
  createCareerInterview: (
    applicationId: string,
    data: CreateCareerInterview,
  ) =>
    request<CareerApplication>(
      `/career/applications/${encodeURIComponent(applicationId)}/interviews`,
      { method: "POST", body: JSON.stringify({ data }) },
    ).then((application) => careerApplicationSchema.parse(application)),
  updateCareerInterview: (
    applicationId: string,
    interviewId: string,
    data: UpdateCareerInterview,
  ) =>
    request<CareerApplication>(
      `/career/applications/${encodeURIComponent(applicationId)}/interviews/${encodeURIComponent(interviewId)}`,
      { method: "PATCH", body: JSON.stringify({ data }) },
    ).then((application) => careerApplicationSchema.parse(application)),
  deleteCareerInterview: (applicationId: string, interviewId: string) =>
    request<CareerApplication>(
      `/career/applications/${encodeURIComponent(applicationId)}/interviews/${encodeURIComponent(interviewId)}`,
      { method: "DELETE" },
    ).then((application) => careerApplicationSchema.parse(application)),
  updateCareerSettings: (data: UpdateCareerSettings) =>
    request<CareerSettings>("/career/settings", {
      method: "PATCH",
      body: JSON.stringify({ data }),
    }).then((settings) => careerSettingsSchema.parse(settings)),
  createCareerActivity: (data: CreateCareerActivity) =>
    request<CareerActivity>("/career/activities", {
      method: "POST",
      body: JSON.stringify({ data }),
    }).then((activity) => careerActivitySchema.parse(activity)),
  deleteCareerActivity: (activityId: string) =>
    request<{ deleted: boolean }>(
      `/career/activities/${encodeURIComponent(activityId)}`,
      { method: "DELETE" },
    ),
  exportBackup: () => request<LearningBackup>("/learning/backup"),
  importBackup: (backup: LearningBackup) =>
    request<{ imported: Record<string, number>; total: number }>("/learning/backup/import", {
      method: "POST",
      body: JSON.stringify({ backup }),
    }),
  generateAiCourse: (profile: AiCourseProfile) =>
    request<AiCourse>("/learning/ai-course/generate", {
      method: "POST",
      body: JSON.stringify(profile),
    }),
  generateAiLesson: (track: TrackKey, itemId: string) =>
    request<AiLesson>(`${trackItemPath(track, itemId)}/lesson`, {
      method: "POST",
    }).then((lesson) => aiLessonSchema.parse(lesson)),
  generateAiLessonStream: (
    track: TrackKey,
    itemId: string,
    onDelta: (delta: string) => void,
  ) =>
    streamRequest<AiLesson>(
      `${trackItemPath(track, itemId)}/lesson/stream`,
      { method: "POST" },
      onDelta,
    ).then((lesson) => aiLessonSchema.parse(lesson)),
  getAiChat: (track: TrackKey, itemId: string) =>
    request<AiChatHistory>(`${trackItemPath(track, itemId)}/chat`),
  sendAiChatMessage: (track: TrackKey, itemId: string, content: string) =>
    request<{ messages: AiChatMessage[] }>(`${trackItemPath(track, itemId)}/chat`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  sendAiChatMessageStream: (
    track: TrackKey,
    itemId: string,
    content: string,
    onDelta: (delta: string) => void,
  ) =>
    streamRequest<{ messages: AiChatMessage[] }>(
      `${trackItemPath(track, itemId)}/chat/stream`,
      { method: "POST", body: JSON.stringify({ content }) },
      onDelta,
    ),
  clearAiChat: (track: TrackKey, itemId: string) =>
    request<{ deleted: boolean }>(`${trackItemPath(track, itemId)}/chat`, {
      method: "DELETE",
    }),
  updateSettings: (settings: SettingsPatch) =>
    request<AppSettings>("/learning/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    }),
  updateTask: (taskId: string, progress: TaskProgressPatch) =>
    request<TaskProgress & { taskId: string }>(`/learning/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(progress),
    }),
  updateQuestion: (questionId: string, progress: QuestionProgress) =>
    request<QuestionProgress & { questionId: string }>(`/learning/questions/${questionId}`, {
      method: "PUT",
      body: JSON.stringify({ status: progress.status, note: progress.note }),
    }),
  reviewQuestion: (
    questionId: string,
    rating: ReviewRating,
    note: string,
    operationId?: string,
  ) =>
    request<QuestionProgress & { questionId: string }>(
      `/learning/questions/${questionId}/review`,
      { method: "POST", body: JSON.stringify({ rating, note, operationId }) },
    ),
  submitQuestionAttempt: (
    questionId: string,
    input: {
      answer: string;
      explanation?: string;
      selectedOptionIndex?: number;
      confidence: number;
      responseTimeMs: number;
      operationId: string;
    },
  ) =>
    request<QuestionAttemptResult>(`/learning/questions/${questionId}/attempts`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((result) => questionAttemptResultSchema.parse(result)),
  submitLessonQuiz: (
    track: TrackKey,
    itemId: string,
    tier: "legacy" | "core" | "deep",
    answers: Array<{ questionId: string; selectedOptionIndex: number }>,
    operationId?: string,
  ) =>
    request<LessonQuizProgress>(`${trackItemPath(track, itemId)}/quiz`, {
      method: "POST",
      body: JSON.stringify({
        answers,
        operationId,
        ...(tier === "legacy" ? {} : { tier }),
      }),
    }),
  savePracticeSolution: (
    track: TrackKey,
    itemId: string,
    lessonVersion: number,
    solution: string,
    baseRevision: number,
    operationId: string,
  ) =>
    request<PracticeSolutionSaveResult>(`${trackItemPath(track, itemId)}/practice`, {
      method: "PUT",
      body: JSON.stringify({
        lessonVersion,
        solution,
        baseRevision,
        operationId,
      }),
    }).then((result) => practiceSolutionSaveResultSchema.parse(result)),
  getPracticeAttempts: (
    track: TrackKey,
    itemId: string,
    source: PracticeAttemptSource,
    limit = 10,
  ) =>
    request<PracticeAttemptHistory>(
      `${trackItemPath(track, itemId)}/practice/attempts?source=${source}&limit=${limit}`,
    ).then((result) => practiceAttemptHistorySchema.parse(result)),
  submitPracticeAttempt: (
    track: TrackKey,
    itemId: string,
    source: PracticeAttemptSource,
    lessonVersion: number | undefined,
    solution: string,
    operationId: string,
    telemetry?: PracticeAttemptTelemetry,
  ) =>
    request<PracticeAttempt>(`${trackItemPath(track, itemId)}/practice/attempts`, {
      method: "POST",
      body: JSON.stringify({
        source,
        lessonVersion,
        solution,
        operationId,
        ...telemetry,
      }),
    }).then((result) => practiceAttemptSchema.parse(result)),
  getCurrentMockInterview: () =>
    request<MockInterview | null>("/learning/mock-interviews/current"),
  startMockInterview: () =>
    request<MockInterview>("/learning/mock-interviews", { method: "POST" }),
  updateMockAnswer: (interviewId: string, questionId: string, content: string) =>
    request<MockInterview>(
      `/learning/mock-interviews/${encodeURIComponent(interviewId)}/answers/${encodeURIComponent(questionId)}`,
      { method: "PUT", body: JSON.stringify({ content }) },
    ),
  completeMockInterview: (interviewId: string) =>
    request<MockInterview>(
      `/learning/mock-interviews/${encodeURIComponent(interviewId)}/complete`,
      { method: "POST" },
    ),
  transcribeMockAnswer: (interviewId: string, audio: Blob) => {
    const form = new FormData();
    form.append("audio", audio, `mock-answer.${audio.type.includes("ogg") ? "ogg" : "webm"}`);
    return request<{ text: string }>(
      `/learning/mock-interviews/${encodeURIComponent(interviewId)}/transcribe`,
      { method: "POST", body: form },
    );
  },
  getYandexPlatformMock: (dayId: YandexMockDayId) =>
    request<unknown>(`/learning/yandex-platform-mocks/${dayId}`).then((result) =>
      result === null ? null : yandexPlatformMockAttemptSchema.parse(result),
    ),
  startYandexPlatformMock: (dayId: YandexMockDayId) =>
    request<YandexPlatformMockAttempt>(`/learning/yandex-platform-mocks/${dayId}`, {
      method: "POST",
    }).then((result) => yandexPlatformMockAttemptSchema.parse(result)),
  saveYandexPlatformMockResponse: (
    attemptId: string,
    questionId: string,
    response: string,
  ) =>
    request<YandexPlatformMockAttempt>(
      `/learning/yandex-platform-mocks/attempts/${encodeURIComponent(attemptId)}/questions/${encodeURIComponent(questionId)}`,
      { method: "PUT", body: JSON.stringify({ response }) },
    ).then((result) => yandexPlatformMockAttemptSchema.parse(result)),
  gradeYandexPlatformMockResponse: (
    attemptId: string,
    questionId: string,
    verdict: YandexMockVerdict,
  ) =>
    request<YandexPlatformMockAttempt>(
      `/learning/yandex-platform-mocks/attempts/${encodeURIComponent(attemptId)}/questions/${encodeURIComponent(questionId)}/grade`,
      { method: "PUT", body: JSON.stringify({ verdict }) },
    ).then((result) => yandexPlatformMockAttemptSchema.parse(result)),
  completeYandexPlatformMock: (attemptId: string) =>
    request<YandexPlatformMockAttempt>(
      `/learning/yandex-platform-mocks/attempts/${encodeURIComponent(attemptId)}/complete`,
      { method: "POST" },
    ).then((result) => yandexPlatformMockAttemptSchema.parse(result)),
  getCurrentInterviewSession: () =>
    request<unknown>("/learning/interview-sessions/current").then((result) =>
      result === null ? null : interviewSessionSchema.parse(result),
    ),
  listInterviewSessions: (limit = 10) =>
    request<unknown>(`/learning/interview-sessions?limit=${limit}`).then((result) =>
      z.array(interviewSessionSchema).parse(result),
    ),
  startInterviewSession: (
    mode: InterviewSessionMode,
    company: InterviewSessionCompany,
    kind: InterviewSessionKind = "training",
    applicationId?: string,
  ) =>
    request<InterviewSession>("/learning/interview-sessions", {
      method: "POST",
      body: JSON.stringify({ mode, company, kind, applicationId }),
    }).then((result) => interviewSessionSchema.parse(result)),
  getReadinessCalibration: () =>
    request<unknown>("/learning/readiness/calibration").then((result) =>
      readinessCalibrationSummarySchema.parse(result),
    ) as Promise<ReadinessCalibrationSummary>,
  captureReadinessPrediction: (
    targetId: InterviewSessionCompany,
    applicationId: string | null = null,
  ) =>
    request<unknown>("/learning/readiness/predictions", {
      method: "POST",
      body: JSON.stringify({ targetId, applicationId }),
    }).then((result) => readinessPredictionSnapshotSchema.parse(result)) as Promise<ReadinessPredictionSnapshot>,
  recordReadinessOutcome: (
    predictionSnapshotId: string,
    company: InterviewSessionCompany,
    technicalPassed: boolean,
  ) =>
    request<unknown>("/learning/readiness/outcomes", {
      method: "POST",
      body: JSON.stringify({
        predictionSnapshotId,
        company,
        technicalPassed,
        codingPassed: null,
        topics: [],
        notes: "",
        occurredAt: new Date().toISOString(),
      }),
    }).then((result) => readinessOutcomeSchema.parse(result)) as Promise<ReadinessOutcome>,
  updateInterviewPlatformAnswer: (
    interviewId: string,
    questionId: string,
    answer: string,
    followUpAnswer?: string,
    secondFollowUpAnswer?: string,
  ) =>
    request<InterviewSession>(
      `${interviewSessionPath(interviewId)}/platform/${encodeURIComponent(questionId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ answer, followUpAnswer, secondFollowUpAnswer }),
      },
    ).then((result) => interviewSessionSchema.parse(result)),
  submitInterviewTurn: (
    interviewId: string,
    answer: string,
    operationId: string,
  ) =>
    request<InterviewSession>(`${interviewSessionPath(interviewId)}/turns`, {
      method: "POST",
      body: JSON.stringify({ answer, operationId }),
    }).then((result) => interviewSessionSchema.parse(result)),
  submitInterviewCodingAttempt: (interviewId: string, solution: string) =>
    request<InterviewSession>(`${interviewSessionPath(interviewId)}/coding/attempt`, {
      method: "POST",
      body: JSON.stringify({ solution }),
    }).then((result) => interviewSessionSchema.parse(result)),
  completeInterviewCoding: (interviewId: string) =>
    request<InterviewSession>(`${interviewSessionPath(interviewId)}/coding/complete`, {
      method: "POST",
    }).then((result) => interviewSessionSchema.parse(result)),
  sendInterviewAiMessageStream: (
    interviewId: string,
    content: string,
    solution: string,
    onDelta: (delta: string) => void,
  ) =>
    streamRequest<InterviewSession>(
      `${interviewSessionPath(interviewId)}/ai/messages/stream`,
      { method: "POST", body: JSON.stringify({ content, solution }) },
      onDelta,
    ).then((result) => interviewSessionSchema.parse(result)),
  submitInterviewAiAttempt: (interviewId: string, solution: string) =>
    request<InterviewSession>(`${interviewSessionPath(interviewId)}/ai/attempt`, {
      method: "POST",
      body: JSON.stringify({ solution }),
    }).then((result) => interviewSessionSchema.parse(result)),
  completeInterviewAi: (interviewId: string) =>
    request<InterviewSession>(`${interviewSessionPath(interviewId)}/ai/complete`, {
      method: "POST",
    }).then((result) => interviewSessionSchema.parse(result)),
  updateInterviewDefenseAnswer: (
    interviewId: string,
    index: number,
    answer: string,
  ) =>
    request<InterviewSession>(`${interviewSessionPath(interviewId)}/defense/${index}`, {
      method: "PUT",
      body: JSON.stringify({ answer }),
    }).then((result) => interviewSessionSchema.parse(result)),
  completeInterviewSession: (interviewId: string) =>
    request<InterviewSession>(`${interviewSessionPath(interviewId)}/complete`, {
      method: "POST",
    }).then((result) => interviewSessionSchema.parse(result)),
  transcribeInterviewAnswer: (interviewId: string, audio: Blob) => {
    const form = new FormData();
    form.append(
      "audio",
      audio,
      `interview-answer.${audio.type.includes("ogg") ? "ogg" : "webm"}`,
    );
    return request<{ text: string }>(
      `${interviewSessionPath(interviewId)}/transcribe`,
      { method: "POST", body: form },
    );
  },
  addAlgorithm: (entry: Omit<AlgorithmEntry, "id">) =>
    request<AlgorithmEntry>("/learning/algorithms", {
      method: "POST",
      body: JSON.stringify(entry),
    }),
  deleteAlgorithm: (id: string) =>
    request<{ deleted: boolean }>(`/learning/algorithms/${id}`, { method: "DELETE" }),
};

export const difficultyLabels: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
