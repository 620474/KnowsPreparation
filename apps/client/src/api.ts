import {
  mergeBootstrapPayloads,
  normalizeBootstrapData,
  type BootstrapContentPayload,
  type BootstrapPayload,
  type BootstrapProgressPayload,
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
  LessonQuizProgress,
  LearningBackup,
  MockInterview,
  QuestionProgress,
  ReviewRating,
  TaskProgress,
  TaskProgressPatch,
  AppSettings,
  SettingsPatch,
} from "./types";
import { SseParser } from "./lib/sse";

const getAiChatPath = (scope: AiChatScope, itemId: string) => {
  if (scope === "yandex") {
    return `/learning/yandex-sprint/blocks/${encodeURIComponent(itemId)}/chat`;
  }
  if (scope === "ozon") {
    return `/learning/ozon-sprint/blocks/${encodeURIComponent(itemId)}/chat`;
  }
  return `/learning/ai-course/lessons/${encodeURIComponent(itemId)}/chat`;
};

const getLessonGeneratePath = (scope: AiChatScope, itemId: string) => {
  const encodedId = encodeURIComponent(itemId);
  if (scope === "yandex") return `/learning/yandex-sprint/blocks/${encodedId}/lesson/generate`;
  if (scope === "ozon") return `/learning/ozon-sprint/blocks/${encodedId}/lesson/generate`;
  return `/learning/ai-course/lessons/${encodedId}/generate`;
};

const getLessonQuizPath = (scope: AiChatScope, itemId: string) => {
  const encodedId = encodeURIComponent(itemId);
  if (scope === "yandex") return `/learning/yandex-sprint/blocks/${encodedId}/quiz`;
  if (scope === "ozon") return `/learning/ozon-sprint/blocks/${encodedId}/quiz`;
  return `/learning/ai-course/lessons/${encodedId}/quiz`;
};

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
      request<BootstrapContentPayload>("/learning/bootstrap/content"),
      request<BootstrapProgressPayload>("/learning/bootstrap/progress"),
    ]).then(([content, progress]) => mergeBootstrapPayloads(content, progress)),
  legacyBootstrap: () =>
    request<BootstrapPayload>("/learning/bootstrap").then(normalizeBootstrapData),
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
  generateAiLesson: (itemId: string) =>
    request<AiLesson>(`/learning/ai-course/lessons/${itemId}/generate`, {
      method: "POST",
    }),
  generateYandexLesson: (blockId: string) =>
    request<AiLesson>(
      `/learning/yandex-sprint/blocks/${encodeURIComponent(blockId)}/lesson/generate`,
      { method: "POST" },
    ),
  generateOzonLesson: (blockId: string) =>
    request<AiLesson>(
      `/learning/ozon-sprint/blocks/${encodeURIComponent(blockId)}/lesson/generate`,
      { method: "POST" },
    ),
  generateAiLessonStream: (
    scope: AiChatScope,
    itemId: string,
    onDelta: (delta: string) => void,
  ) =>
    streamRequest<AiLesson>(`${getLessonGeneratePath(scope, itemId)}/stream`, {
      method: "POST",
    }, onDelta),
  getAiChat: (scope: AiChatScope, itemId: string) =>
    request<AiChatHistory>(getAiChatPath(scope, itemId)),
  sendAiChatMessage: (scope: AiChatScope, itemId: string, content: string) =>
    request<{ messages: AiChatMessage[] }>(getAiChatPath(scope, itemId), {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  sendAiChatMessageStream: (
    scope: AiChatScope,
    itemId: string,
    content: string,
    onDelta: (delta: string) => void,
  ) =>
    streamRequest<{ messages: AiChatMessage[] }>(
      `${getAiChatPath(scope, itemId)}/stream`,
      { method: "POST", body: JSON.stringify({ content }) },
      onDelta,
    ),
  clearAiChat: (scope: AiChatScope, itemId: string) =>
    request<{ deleted: boolean }>(getAiChatPath(scope, itemId), { method: "DELETE" }),
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
    scope: AiChatScope,
    itemId: string,
    answers: Array<{ questionId: string; selectedOptionIndex: number }>,
    operationId?: string,
  ) =>
    request<LessonQuizProgress>(getLessonQuizPath(scope, itemId), {
      method: "POST",
      body: JSON.stringify({ answers, operationId }),
    }),
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
