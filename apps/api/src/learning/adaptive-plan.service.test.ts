import type { AdaptivePlanItem } from "@prep/contracts";
import { describe, expect, it } from "vitest";

import {
  applyReadinessPriority,
  selectAdaptivePlanItems,
} from "./adaptive-plan.service";

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

  it("raises evidence-backed weak skills above already strong skills", () => {
    const weak = candidate("weak", 60, 30);
    const strong: AdaptivePlanItem = {
      ...candidate("strong", 60, 30),
      skillKeys: ["react"],
    };
    const ranked = applyReadinessPriority(
      [weak, strong],
      new Map([
        ["javascript", { score: 30, signalCount: 3 }],
        ["react", { score: 90, signalCount: 3 }],
      ]),
      "mixed",
    );

    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
    expect(ranked[0]!.reason).toContain("дефицит 70%");
  });
});
