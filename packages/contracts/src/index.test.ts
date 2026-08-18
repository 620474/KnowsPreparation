import { describe, expect, it } from "vitest";

import {
  practiceSolutionSaveResultSchema,
  studyExerciseRunnerSchema,
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
});
