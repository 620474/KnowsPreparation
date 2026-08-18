import type { BootstrapData, QuestionProgress } from "../types";
import { normalizeQuestionProgress } from "./question-progress";

export type BootstrapPayload = Omit<
  BootstrapData,
  "ai" | "ozonSprint" | "mockInterviews" | "progress" | "settings"
> & {
  settings: Omit<BootstrapData["settings"], "reminderEnabled" | "reminderTime"> &
    Partial<Pick<BootstrapData["settings"], "reminderEnabled" | "reminderTime">>;
  ozonSprint?: BootstrapData["ozonSprint"];
  mockInterviews?: BootstrapData["mockInterviews"];
  ai?: Partial<BootstrapData["ai"]>;
  progress: {
    tasks: BootstrapData["progress"]["tasks"];
    questions: Record<string, Partial<QuestionProgress>>;
  };
};

export type BootstrapContentPayload = Pick<
  BootstrapPayload,
  | "curriculum"
  | "yandexSprint"
  | "ozonSprint"
  | "resources"
  | "questions"
  | "algorithmPatterns"
> & { contentVersion: string };

export type BootstrapProgressPayload = Pick<
  BootstrapPayload,
  "settings" | "progress" | "algorithms" | "mockInterviews" | "ai"
>;

export function mergeBootstrapPayloads(
  content: BootstrapContentPayload,
  progress: BootstrapProgressPayload,
) {
  return normalizeBootstrapData({ ...content, ...progress });
}

export function normalizeBootstrapData(data: BootstrapPayload): BootstrapData {
  return {
    ...data,
    settings: {
      ...data.settings,
      reminderEnabled: data.settings.reminderEnabled ?? false,
      reminderTime: data.settings.reminderTime ?? "19:00",
    },
    ozonSprint: data.ozonSprint ?? [],
    mockInterviews: data.mockInterviews ?? [],
    progress: {
      tasks: data.progress.tasks,
      questions: Object.fromEntries(
        Object.entries(data.progress.questions).map(([questionId, progress]) => [
          questionId,
          normalizeQuestionProgress(progress),
        ]),
      ),
    },
    ai: {
      enabled: data.ai?.enabled ?? false,
      model: data.ai?.model ?? "",
      course: data.ai?.course ?? null,
      lessons: data.ai?.lessons ?? {},
      yandexLessons: data.ai?.yandexLessons ?? {},
      ozonLessons: data.ai?.ozonLessons ?? {},
      quizProgress: data.ai?.quizProgress ?? { course: {}, yandex: {}, ozon: {} },
    },
  };
}
