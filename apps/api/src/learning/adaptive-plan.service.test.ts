import type { AdaptivePlanItem } from "@prep/contracts";
import { describe, expect, it } from "vitest";

import { selectAdaptivePlanItems } from "./adaptive-plan.service";

const candidate = (
  id: string,
  score: number,
  minutes: number,
): AdaptivePlanItem => ({
  id,
  kind: "practice",
  title: id,
  reason: "test",
  minutes,
  score,
  skillKeys: ["javascript"],
  track: "yandex",
  itemId: id,
  source: "task",
});

describe("selectAdaptivePlanItems", () => {
  it("fills the budget by priority without exceeding it", () => {
    const result = selectAdaptivePlanItems(
      [candidate("plan", 50, 60), candidate("failed", 100, 30), candidate("quiz", 80, 20)],
      50,
    );

    expect(result.map((item) => item.id)).toEqual(["failed", "quiz"]);
    expect(result.reduce((sum, item) => sum + item.minutes, 0)).toBe(50);
  });

  it("replaces a skipped recommendation with the next candidate", () => {
    const result = selectAdaptivePlanItems(
      [candidate("failed", 100, 30), candidate("quiz", 80, 20)],
      30,
      new Set(["failed"]),
    );

    expect(result.map((item) => item.id)).toEqual(["quiz"]);
  });
});
