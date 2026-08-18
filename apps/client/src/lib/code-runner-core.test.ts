import { describe, expect, it } from "vitest";

import { areRunnerValuesEqual, formatRunnerValue } from "./code-runner-core";

describe("code runner values", () => {
  it("compares nested values without depending on object key order", () => {
    expect(areRunnerValuesEqual({ answer: [1, 2], ok: true }, { ok: true, answer: [1, 2] })).toBe(true);
    expect(areRunnerValuesEqual([1, 2], [2, 1])).toBe(false);
  });

  it("formats special values", () => {
    expect(formatRunnerValue(undefined)).toBe("undefined");
    expect(formatRunnerValue(Number.NaN)).toBe("NaN");
  });
});
