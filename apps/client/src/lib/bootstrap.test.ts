import { describe, expect, it } from "vitest";

import { normalizeBootstrapData, type BootstrapPayload } from "./bootstrap";

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
    });
  });

  it("keeps AI data returned by the current API", () => {
    const ai = {
      enabled: true,
      model: "test-model",
      course: null,
      lessons: {},
      yandexLessons: {},
    };

    expect(normalizeBootstrapData({ ...legacyBootstrap, ai }).ai).toEqual(ai);
  });
});
