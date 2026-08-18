import { describe, expect, it } from "vitest";

import { parseReminderTime } from "./notifications";

describe("parseReminderTime", () => {
  it("parses valid daily reminder time", () => {
    expect(parseReminderTime("07:05")).toEqual({ hour: 7, minute: 5 });
    expect(parseReminderTime("23:59")).toEqual({ hour: 23, minute: 59 });
  });

  it("rejects invalid time", () => {
    expect(() => parseReminderTime("24:00")).toThrow();
    expect(() => parseReminderTime("9:30")).toThrow();
  });
});
