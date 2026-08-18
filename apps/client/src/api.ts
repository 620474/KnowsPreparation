import {
  mergeBootstrapPayloads,
  parseBootstrapContent,
  parseBootstrapProgress,
} from "./lib/bootstrap";
import type {
  AlgorithmEntry,
  AiCourse,
  AiCourseProfile,
  AiChatHistory,
  AiChatMessage,
  AiLesson,
  Difficulty,
  LessonQuizProgress,
  LearningBackup,
  MockInterview,
  PracticeSolutionSaveResult,
  QuestionProgress,
  ReviewRating,
  TaskProgress,
  TaskProgressPatch,
  TrackKey,
  AppSettings,
  SettingsPatch,
} from "./types";
import { SseParser } from "./lib/sse";

/** Все ресурсы трека живут под одним префиксом, поэтому путь один для всех. */
const trackItemPath = (track: TrackKey, itemId: string) =>
  `/learning/tracks/${track}/items/${encodeURIComponent(itemId)}`;

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
  submitLessonQuiz: (
    track: TrackKey,
    itemId: string,
    answers: Array<{ questionId: string; selectedOptionIndex: number }>,
    operationId?: string,
  ) =>
    request<LessonQuizProgress>(`${trackItemPath(track, itemId)}/quiz`, {
      method: "POST",
      body: JSON.stringify({ answers, operationId }),
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
import { aiLessonSchema, practiceSolutionSaveResultSchema } from "@prep/contracts";
