import { describe, expect, it } from "vitest";

import {
  findSprintTrackByCourse,
  getSprintBlock,
  SPRINT_TASK_IDS,
  SPRINT_TRACK_LIST,
} from "./track-registry";

describe("sprint track registry", () => {
  it("keeps course keys and task identifiers unique", () => {
    expect(new Set(SPRINT_TRACK_LIST.map((track) => track.courseKey)).size).toBe(
      SPRINT_TRACK_LIST.length,
    );
    const taskCount = SPRINT_TRACK_LIST.reduce(
      (total, track) =>
        total + track.days.reduce((sum, day) => sum + day.blocks.length, 0),
      0,
    );
    expect(SPRINT_TASK_IDS.size).toBe(taskCount);
  });

  it("finds blocks and persisted lesson scopes", () => {
    const yandex = SPRINT_TRACK_LIST.find((track) => track.scope === "yandex");
    const blockId = yandex?.days[0]?.blocks[0]?.id;
    if (!yandex || !blockId) throw new Error("Yandex track must contain a block");

    expect(getSprintBlock("yandex", blockId).block.id).toBe(blockId);
    expect(findSprintTrackByCourse(yandex.courseKey, yandex.courseVersion)?.scope).toBe(
      "yandex",
    );
  });
});
