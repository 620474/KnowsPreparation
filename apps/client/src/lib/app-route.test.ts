import { describe, expect, it } from "vitest";

import type { AppView } from "./app-route";
import { formatAppRoute, parseAppRoute, viewForTrack } from "./app-route";

describe("app routes", () => {
  it("falls back to Today for an empty or unknown route", () => {
    expect(parseAppRoute("")).toEqual({ view: "today", lessonReader: null });
    expect(parseAppRoute("#/unknown")).toEqual({ view: "today", lessonReader: null });
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

  it("round-trips a plan day and its lesson", () => {
    const dayRoute = {
      view: "plan" as const,
      planDayId: "w02-d03",
      lessonReader: null,
    };
    const lessonRoute = {
      ...dayRoute,
      lessonReader: {
        track: "curriculum" as const,
        itemId: "closures/замыкания",
      },
    };

    expect(formatAppRoute(dayRoute)).toBe("#/plan/day/w02-d03");
    expect(parseAppRoute(formatAppRoute(dayRoute))).toEqual(dayRoute);
    expect(formatAppRoute(lessonRoute)).toBe(
      "#/plan/day/w02-d03/lesson/closures%2F%D0%B7%D0%B0%D0%BC%D1%8B%D0%BA%D0%B0%D0%BD%D0%B8%D1%8F",
    );
    expect(parseAppRoute(formatAppRoute(lessonRoute))).toEqual(lessonRoute);
  });

  it("maps lesson tracks to their parent views", () => {
    expect(viewForTrack("course")).toBe("ai-course");
    expect(viewForTrack("curriculum")).toBe("plan");
    expect(viewForTrack("yandex")).toBe("yandex");
    expect(viewForTrack("ozon")).toBe("ozon");
  });
});
