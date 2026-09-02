import { describe, expect, it } from "vitest";

import type { AppView } from "./app-route";
import { formatAppPath, formatAppRoute, parseAppRoute, viewForTrack } from "./app-route";

describe("app routes", () => {
  it("falls back to Today for an empty or unknown route", () => {
    expect(parseAppRoute("")).toEqual({ view: "today", lessonReader: null });
    expect(parseAppRoute("#/unknown")).toEqual({ view: "today", lessonReader: null });
  });

  it.each<[AppView, string]>([
    ["today", "#/today"],
    ["preparation", "#/preparation"],
    ["knowledge", "#/knowledge"],
    ["skills", "#/skills"],
    ["career", "#/career"],
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

  it("formats router paths without a hash prefix", () => {
    expect(formatAppPath({ view: "preparation", lessonReader: null })).toBe(
      "/preparation",
    );
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

  it.each([
    ["plan", "curriculum", "w02-d03"],
    ["yandex", "yandex", "yandex-d03"],
    ["ozon", "ozon", "ozon-d03"],
  ] as const)("round-trips a %s day and its lesson", (view, track, dayId) => {
    const dayRoute = {
      view,
      dayReader: { track, dayId },
      lessonReader: null,
    };
    const lessonRoute = {
      ...dayRoute,
      lessonReader: {
        track,
        itemId: "closures/замыкания",
      },
    };

    expect(formatAppRoute(dayRoute)).toBe(`#/${view}/day/${dayId}`);
    expect(parseAppRoute(formatAppRoute(dayRoute))).toEqual(dayRoute);
    expect(formatAppRoute(lessonRoute)).toBe(
      `#/${view}/day/${dayId}/lesson/closures%2F%D0%B7%D0%B0%D0%BC%D1%8B%D0%BA%D0%B0%D0%BD%D0%B8%D1%8F`,
    );
    expect(parseAppRoute(formatAppRoute(lessonRoute))).toEqual(lessonRoute);
  });

  it("maps lesson tracks to their parent views", () => {
    expect(viewForTrack("course")).toBe("ai-course");
    expect(viewForTrack("curriculum")).toBe("plan");
    expect(viewForTrack("yandex")).toBe("yandex");
    expect(viewForTrack("ozon")).toBe("ozon");
  });

  it("round-trips a Yandex platform mock route", () => {
    const route = {
      view: "yandex" as const,
      lessonReader: null,
      dayReader: { track: "yandex" as const, dayId: "yandex-d07" },
      yandexMockDayId: "yandex-d07",
    };
    expect(formatAppRoute(route)).toBe("#/yandex/mock/yandex-d07");
    expect(parseAppRoute("#/yandex/mock/yandex-d07")).toEqual(route);
  });

  it("round-trips a research project route", () => {
    const route = {
      view: "research" as const,
      lessonReader: null,
      researchProjectId: "rag/надёжность",
    };
    expect(formatAppRoute(route)).toBe(
      "#/research/rag%2F%D0%BD%D0%B0%D0%B4%D1%91%D0%B6%D0%BD%D0%BE%D1%81%D1%82%D1%8C",
    );
    expect(parseAppRoute(formatAppRoute(route))).toEqual(route);
    expect(parseAppRoute("#/research")).toEqual({
      view: "research",
      lessonReader: null,
      researchProjectId: null,
    });
  });

  it("round-trips a skill detail route", () => {
    const route = {
      view: "skills" as const,
      lessonReader: null,
      skillId: "async.event-loop",
    };
    expect(formatAppRoute(route)).toBe("#/skills/async.event-loop");
    expect(parseAppRoute(formatAppRoute(route))).toEqual(route);
  });

  it("round-trips a mission route after reload", () => {
    const route = {
      view: "mission" as const,
      lessonReader: null,
      missionId: "mission/async",
    };
    expect(formatAppRoute(route)).toBe("#/missions/mission%2Fasync");
    expect(parseAppRoute(formatAppRoute(route))).toEqual(route);
  });
});
