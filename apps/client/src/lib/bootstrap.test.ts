import { describe, expect, it } from "vitest";

import {
  mergeBootstrapPayloads,
  parseBootstrapContent,
  parseBootstrapProgress,
} from "./bootstrap";
import type { BootstrapContent, BootstrapProgress } from "../types";

const emptyTrackRecord = { course: {}, curriculum: {}, yandex: {}, ozon: {}, avito: {}, tbank: {} };

const content: BootstrapContent = {
  contentVersion: "content-v1",
  curriculum: [],
  yandexSprint: [],
  ozonSprint: [],
  avitoSprint: [],
  tbankSprint: [],
  resources: [],
  questions: [],
  algorithmPatterns: [],
};

const progress: BootstrapProgress = {
  settings: {
    startDate: "2026-08-01",
    dailyMinutes: 120,
    coreWeeks: 12,
    bufferWeeks: 0,
    reminderEnabled: false,
    reminderTime: "19:00",
    adaptiveTodayEnabled: true,
  },
  progress: { tasks: {}, questions: {} },
  algorithms: [],
  mockInterviews: [],
  ai: {
    enabled: false,
    model: "",
    course: null,
    lessons: emptyTrackRecord,
    quizProgress: emptyTrackRecord,
    practiceProgress: emptyTrackRecord,
  },
};

describe("bootstrap payloads", () => {
  it("combines cacheable content with dynamic progress", () => {
    expect(mergeBootstrapPayloads(content, progress)).toMatchObject({
      contentVersion: "content-v1",
      settings: { startDate: "2026-08-01" },
      progress: { tasks: {}, questions: {} },
      curriculum: [],
    });
  });

  it("validates both halves against the shared contract", () => {
    expect(parseBootstrapContent(content).contentVersion).toBe("content-v1");
    expect(Object.keys(parseBootstrapProgress(progress).ai.lessons)).toEqual([
      "course",
      "curriculum",
      "yandex",
      "ozon",
      "avito",
      "tbank",
    ]);
  });

  it("rejects a response missing the curriculum track", () => {
    const legacyAi = {
      ...progress.ai,
      lessons: { course: {}, yandex: {}, ozon: {} },
    };

    expect(() => parseBootstrapProgress({ ...progress, ai: legacyAi })).toThrow();
  });

  it("rejects content without a version", () => {
    const withoutVersion = { ...content, contentVersion: undefined };

    expect(() => parseBootstrapContent(withoutVersion)).toThrow();
  });
});
