import type { BootstrapData, QuestionProgress } from "../types";
import { normalizeQuestionProgress } from "./question-progress";

export type BootstrapPayload = Omit<
  BootstrapData,
  "ai" | "ozonSprint" | "mockInterviews" | "progress"
> & {
  ozonSprint?: BootstrapData["ozonSprint"];
  mockInterviews?: BootstrapData["mockInterviews"];
  ai?: Partial<BootstrapData["ai"]>;
  progress: {
    tasks: BootstrapData["progress"]["tasks"];
    questions: Record<string, Partial<QuestionProgress>>;
  };
};

export function normalizeBootstrapData(data: BootstrapPayload): BootstrapData {
  return {
    ...data,
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
