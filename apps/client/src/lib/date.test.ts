import { describe, expect, it } from "vitest";

import { getStudyPosition } from "./date";

describe("getStudyPosition", () => {
  it("starts with the first day", () => {
    expect(getStudyPosition("2026-08-04", "2026-08-04")).toEqual({
      rawOffset: 0,
      weekNumber: 1,
      dayNumber: 1,
    });
  });

  it("moves to the next week every seven days", () => {
    expect(getStudyPosition("2026-08-04", "2026-08-11")).toEqual({
      rawOffset: 7,
      weekNumber: 2,
      dayNumber: 1,
    });
  });
});
