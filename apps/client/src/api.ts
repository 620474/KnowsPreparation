import {
  normalizeBootstrapData,
  type BootstrapPayload,
} from "./lib/bootstrap";
import type {
  AlgorithmEntry,
  AiChatScope,
  AiCourse,
  AiCourseProfile,
  AiChatHistory,
  AiChatMessage,
  AiLesson,
  Difficulty,
  QuestionProgress,
  TaskProgress,
  TaskProgressPatch,
} from "./types";

const getAiChatPath = (scope: AiChatScope, itemId: string) =>
  scope === "yandex"
    ? `/learning/yandex-sprint/blocks/${encodeURIComponent(itemId)}/chat`
    : `/learning/ai-course/lessons/${encodeURIComponent(itemId)}/chat`;

const API_URL_KEY = "prep-api-url";
const TOKEN_KEY = "prep-auth-token";
export const UNAUTHORIZED_EVENT = "prep:unauthorized";

export const DEFAULT_API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

export function getApiUrl() {
  return localStorage.getItem(API_URL_KEY) ?? DEFAULT_API_URL;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

function normalizeApiUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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

  return response.json() as Promise<T>;
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
    request<BootstrapPayload>("/learning/bootstrap").then(normalizeBootstrapData),
  generateAiCourse: (profile: AiCourseProfile) =>
    request<AiCourse>("/learning/ai-course/generate", {
      method: "POST",
      body: JSON.stringify(profile),
    }),
  generateAiLesson: (itemId: string) =>
    request<AiLesson>(`/learning/ai-course/lessons/${itemId}/generate`, {
      method: "POST",
    }),
  generateYandexLesson: (blockId: string) =>
    request<AiLesson>(
      `/learning/yandex-sprint/blocks/${encodeURIComponent(blockId)}/lesson/generate`,
      { method: "POST" },
    ),
  getAiChat: (scope: AiChatScope, itemId: string) =>
    request<AiChatHistory>(getAiChatPath(scope, itemId)),
  sendAiChatMessage: (scope: AiChatScope, itemId: string, content: string) =>
    request<{ messages: AiChatMessage[] }>(getAiChatPath(scope, itemId), {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  clearAiChat: (scope: AiChatScope, itemId: string) =>
    request<{ deleted: boolean }>(getAiChatPath(scope, itemId), { method: "DELETE" }),
  updateSettings: (startDate: string) =>
    request<{ startDate: string }>("/learning/settings", {
      method: "PATCH",
      body: JSON.stringify({ startDate }),
    }),
  updateTask: (taskId: string, progress: TaskProgressPatch) =>
    request<TaskProgress & { taskId: string }>(`/learning/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(progress),
    }),
  updateQuestion: (questionId: string, progress: QuestionProgress) =>
    request<QuestionProgress & { questionId: string }>(`/learning/questions/${questionId}`, {
      method: "PUT",
      body: JSON.stringify(progress),
    }),
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
