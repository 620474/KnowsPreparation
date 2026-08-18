import { describe, expect, it } from "vitest";

import { CURRICULUM, TASK_IDS } from "./curriculum";
import {
  CURRICULUM_DAYS,
  findStaticTrackByCourse,
  getStaticTrackItem,
  isStaticTrackKey,
  isTrackKey,
  SPRINT_TASK_IDS,
  STATIC_TRACK_LIST,
  TRACK_KEYS,
} from "./track-registry";

describe("track registry", () => {
  it("exposes four tracks with unique course keys", () => {
    expect(TRACK_KEYS).toEqual(["course", "curriculum", "yandex", "ozon"]);
    expect(STATIC_TRACK_LIST).toHaveLength(3);
    expect(new Set(STATIC_TRACK_LIST.map((track) => track.courseKey)).size).toBe(
      STATIC_TRACK_LIST.length,
    );
    expect(STATIC_TRACK_LIST.every((track) => track.days.length > 0)).toBe(true);
  });

  it("recognises track keys and separates the dynamic course", () => {
    expect(isTrackKey("curriculum")).toBe(true);
    expect(isTrackKey("unknown")).toBe(false);
    expect(isStaticTrackKey("course")).toBe(false);
    expect(isStaticTrackKey("ozon")).toBe(true);
  });

  it("flattens the curriculum into all study days", () => {
    const expectedDays = CURRICULUM.reduce((sum, week) => sum + week.days.length, 0);
    expect(CURRICULUM_DAYS).toHaveLength(expectedDays);
    expect(new Set(CURRICULUM_DAYS.map((day) => day.id)).size).toBe(expectedDays);
  });

  it("keeps sprint task ids separate from curriculum task ids", () => {
    const sprintCount = STATIC_TRACK_LIST.filter(
      (track) => track.key !== "curriculum",
    ).reduce(
      (sum, track) =>
        sum + track.days.reduce((daySum, day) => daySum + day.blocks.length, 0),
      0,
    );
    expect(SPRINT_TASK_IDS.size).toBe(sprintCount);
    expect([...SPRINT_TASK_IDS].some((id) => TASK_IDS.has(id))).toBe(false);
  });

  it("resolves items for every static track", () => {
    for (const track of STATIC_TRACK_LIST) {
      const itemId = track.days[0]?.blocks[0]?.id;
      if (!itemId) throw new Error(`${track.key} must contain at least one block`);
      expect(getStaticTrackItem(track.key, itemId).block.id).toBe(itemId);
      expect(findStaticTrackByCourse(track.courseKey, track.courseVersion)?.key).toBe(
        track.key,
      );
    }
  });

  it("throws a track specific message for an unknown item", () => {
    expect(() => getStaticTrackItem("curriculum", "missing")).toThrowError(
      /учебного плана/,
    );
  });
});
