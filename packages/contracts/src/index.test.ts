import { describe, expect, it } from "vitest";

import {
  bootstrapContentSchema,
  bootstrapDataSchema,
  bootstrapProgressSchema,
  practiceSolutionSaveResultSchema,
  studyExerciseRunnerSchema,
  trackKeySchema,
  TRACK_KEYS,
} from "./index";

describe("shared API contracts", () => {
  it("validates runnable exercises", () => {
    expect(studyExerciseRunnerSchema.parse({
      starterCode: "function solve() {}",
      testCases: [{ title: "case", expression: "solve()", expected: 1 }],
    }).testCases).toHaveLength(1);
  });

  it("rejects malformed practice revisions", () => {
    expect(() => practiceSolutionSaveResultSchema.parse({
      saved: true,
      progress: { revision: "one" },
    })).toThrow();
  });

  it("accepts every learning track key", () => {
    expect(TRACK_KEYS).toEqual(["course", "curriculum", "yandex", "ozon"]);
    for (const key of TRACK_KEYS) {
      expect(trackKeySchema.parse(key)).toBe(key);
    }
    expect(() => trackKeySchema.parse("sprint")).toThrow();
  });

  it("requires progress records for all four tracks", () => {
    const quizProgress = bootstrapProgressSchema.shape.ai.shape.quizProgress;
    expect(Object.keys(quizProgress.shape)).toEqual([
      "course",
      "curriculum",
      "yandex",
      "ozon",
    ]);
    expect(() => quizProgress.parse({ course: {}, yandex: {}, ozon: {} })).toThrow();
    expect(
      quizProgress.parse({ course: {}, curriculum: {}, yandex: {}, ozon: {} }),
    ).toEqual({ course: {}, curriculum: {}, yandex: {}, ozon: {} });
  });

  it("merges content and progress into the full bootstrap shape", () => {
    const contentKeys = Object.keys(bootstrapContentSchema.shape);
    const progressKeys = Object.keys(bootstrapProgressSchema.shape);
    const dataKeys = Object.keys(bootstrapDataSchema.shape);
    expect(dataKeys).toEqual([...contentKeys, ...progressKeys]);
  });
});
