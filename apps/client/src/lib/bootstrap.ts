import type { BootstrapData } from "../types";

export type BootstrapPayload = Omit<BootstrapData, "ai"> & {
  ai?: Partial<BootstrapData["ai"]>;
};

export function normalizeBootstrapData(data: BootstrapPayload): BootstrapData {
  return {
    ...data,
    ai: {
      enabled: data.ai?.enabled ?? false,
      model: data.ai?.model ?? "",
      course: data.ai?.course ?? null,
      lessons: data.ai?.lessons ?? {},
      yandexLessons: data.ai?.yandexLessons ?? {},
    },
  };
}
