import { describe, expect, it } from "vitest";

import type { AppView } from "./app-route";
import { formatAppRoute, parseAppRoute, viewForTrack } from "./app-route";

describe("app routes", () => {
  it("falls back to the Yandex sprint for an empty or unknown route", () => {
    expect(parseAppRoute("")).toEqual({ view: "yandex", lessonReader: null });
    expect(parseAppRoute("#/unknown")).toEqual({ view: "yandex", lessonReader: null });
  });

  it.each<[AppView, string]>([
    ["today", "#/today"],
    ["yandex", "#/yandex"],
    ["ozon", "#/ozon"],
    ["ai-course", "#/ai"],
    ["plan", "#/plan"],
    ["resources", "#/resources"],
    ["questions", "#/questions"],
    ["review", "#/review"],
    ["mock-interview", "#/mock-interview"],
    ["interview", "#/interview"],
    ["analytics", "#/analytics"],
    ["algorithms", "#/algorithms"],
    ["settings", "#/settings"],
  ])("round-trips the %s view", (view, hash) => {
    const route = { view, lessonReader: null };
    expect(formatAppRoute(route)).toBe(hash);
    expect(parseAppRoute(hash)).toEqual(route);
  });

  it("round-trips an encoded lesson route", () => {
    const route = {
      view: "yandex" as const,
      lessonReader: { track: "yandex" as const, itemId: "event loop/очередь" },
    };
    const hash = formatAppRoute(route);

    expect(hash).toBe("#/yandex/lesson/event%20loop%2F%D0%BE%D1%87%D0%B5%D1%80%D0%B5%D0%B4%D1%8C");
    expect(parseAppRoute(hash)).toEqual(route);
  });

  it("maps lesson tracks to their parent views", () => {
    expect(viewForTrack("course")).toBe("ai-course");
    expect(viewForTrack("curriculum")).toBe("plan");
    expect(viewForTrack("yandex")).toBe("yandex");
    expect(viewForTrack("ozon")).toBe("ozon");
  });
});
