import { describe, expect, it } from "vitest";

import {
  mergeBootstrapPayloads,
  normalizeBootstrapData,
  type BootstrapContentPayload,
  type BootstrapPayload,
  type BootstrapProgressPayload,
} from "./bootstrap";

const legacyBootstrap: BootstrapPayload = {
  settings: {
    startDate: "2026-08-01",
    dailyMinutes: 120,
    coreWeeks: 12,
    bufferWeeks: 0,
  },
  curriculum: [],
  yandexSprint: [],
  resources: [],
  questions: [],
  algorithmPatterns: [],
  progress: { tasks: {}, questions: {} },
  algorithms: [],
};

describe("normalizeBootstrapData", () => {
  it("adds a disabled AI state to a legacy bootstrap response", () => {
    expect(normalizeBootstrapData(legacyBootstrap).ai).toEqual({
      enabled: false,
      model: "",
      course: null,
      lessons: {},
      yandexLessons: {},
      ozonLessons: {},
      quizProgress: { course: {}, yandex: {}, ozon: {} },
      practiceProgress: { course: {}, yandex: {}, ozon: {} },
    });
    expect(normalizeBootstrapData(legacyBootstrap).ozonSprint).toEqual([]);
    expect(normalizeBootstrapData(legacyBootstrap).mockInterviews).toEqual([]);
  });

  it("keeps AI data returned by the current API", () => {
    const ai = {
      enabled: true,
      model: "test-model",
      course: null,
      lessons: {},
      yandexLessons: {},
      ozonLessons: {},
      quizProgress: { course: {}, yandex: {}, ozon: {} },
      practiceProgress: { course: {}, yandex: {}, ozon: {} },
    };

    expect(normalizeBootstrapData({ ...legacyBootstrap, ai }).ai).toEqual(ai);
  });

  it("combines cacheable content with dynamic progress", () => {
    const content: BootstrapContentPayload = {
      contentVersion: "content-v1",
      curriculum: [],
      yandexSprint: [],
      ozonSprint: [],
      resources: [],
      questions: [],
      algorithmPatterns: [],
    };
    const progress: BootstrapProgressPayload = {
      settings: legacyBootstrap.settings,
      progress: legacyBootstrap.progress,
      algorithms: [],
      mockInterviews: [],
      ai: {
        enabled: false,
        model: "",
        course: null,
        lessons: {},
        yandexLessons: {},
        ozonLessons: {},
        quizProgress: { course: {}, yandex: {}, ozon: {} },
        practiceProgress: { course: {}, yandex: {}, ozon: {} },
      },
    };

    expect(mergeBootstrapPayloads(content, progress)).toMatchObject({
      settings: { startDate: "2026-08-01" },
      progress: { tasks: {}, questions: {} },
      curriculum: [],
    });
  });
});
