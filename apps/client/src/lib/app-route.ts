import type { TrackKey } from "../types";

export type AppView =
  | "today"
  | "preparation"
  | "knowledge"
  | "skills"
  | "career"
  | "yandex"
  | "ozon"
  | "ai-course"
  | "plan"
  | "resources"
  | "questions"
  | "review"
  | "mock-interview"
  | "interview"
  | "analytics"
  | "mission"
  | "research"
  | "algorithms"
  | "settings";

export interface LessonRouteTarget {
  track: TrackKey;
  itemId: string;
}

export type DayTrackKey = Extract<TrackKey, "curriculum" | "yandex" | "ozon">;

export interface DayRouteTarget {
  track: DayTrackKey;
  dayId: string;
}

export interface AppRoute {
  view: AppView;
  lessonReader: LessonRouteTarget | null;
  dayReader?: DayRouteTarget | null;
  yandexMockDayId?: string | null;
  researchProjectId?: string | null;
  skillId?: string | null;
  missionId?: string | null;
}

const DEFAULT_ROUTE: AppRoute = { view: "today", lessonReader: null };

const viewPaths: Record<AppView, string> = {
  today: "today",
  preparation: "preparation",
  knowledge: "knowledge",
  skills: "skills",
  career: "career",
  yandex: "yandex",
  ozon: "ozon",
  "ai-course": "ai",
  plan: "plan",
  resources: "resources",
  questions: "questions",
  review: "review",
  "mock-interview": "mock-interview",
  interview: "interview",
  analytics: "analytics",
  mission: "missions",
  research: "research",
  algorithms: "algorithms",
  settings: "settings",
};

const pathViews = Object.fromEntries(
  Object.entries(viewPaths).map(([view, path]) => [path, view]),
) as Record<string, AppView>;

/** Родительский экран каждого трека; новый TrackKey нельзя добавить незаметно. */
const trackViews = {
  course: "ai-course",
  curriculum: "plan",
  yandex: "yandex",
  ozon: "ozon",
} satisfies Record<TrackKey, AppView>;

const viewTracks = Object.fromEntries(
  Object.entries(trackViews).map(([track, view]) => [view, track]),
) as Partial<Record<AppView, TrackKey>>;

export const trackForView = (view: AppView): TrackKey | undefined => viewTracks[view];

const isDayTrack = (track: TrackKey | undefined): track is DayTrackKey =>
  track === "curriculum" || track === "yandex" || track === "ozon";

const decodeItemId = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
};

export function parseAppPath(pathname: string): AppRoute {
  const path = pathname.replace(/^#/, "");
  const segments = path.split("/").filter(Boolean);
  const view = pathViews[segments[0] ?? ""];
  if (!view) return DEFAULT_ROUTE;

  if (view === "research") {
    return {
      view,
      lessonReader: null,
      researchProjectId: segments[1] ? decodeItemId(segments[1]) : null,
    };
  }

  if (view === "skills") {
    const skillId = segments[1] ? decodeItemId(segments[1]) : "";
    return {
      view,
      lessonReader: null,
      ...(skillId ? { skillId } : {}),
    };
  }

  if (view === "mission") {
    const missionId = segments[1] ? decodeItemId(segments[1]) : "";
    return {
      view,
      lessonReader: null,
      missionId: missionId || null,
    };
  }

  const track = viewTracks[view];
  if (track === "yandex" && segments[1] === "mock" && segments[2]) {
    const dayId = decodeItemId(segments[2]);
    return {
      view,
      lessonReader: null,
      dayReader: { track, dayId },
      yandexMockDayId: dayId,
    };
  }
  if (isDayTrack(track) && segments[1] === "day" && segments[2]) {
    const dayId = decodeItemId(segments[2]);
    const lessonItemId =
      segments[3] === "lesson" && segments[4] ? decodeItemId(segments[4]) : "";

    return {
      view,
      dayReader: { track, dayId },
      lessonReader: lessonItemId
        ? { track, itemId: lessonItemId }
        : null,
    };
  }

  const itemId = segments[1] === "lesson" && segments[2] ? decodeItemId(segments[2]) : "";

  return {
    view,
    lessonReader: track && itemId ? { track, itemId } : null,
  };
}

export function parseAppRoute(hash: string): AppRoute {
  return parseAppPath(hash);
}

export function formatAppPath(route: AppRoute): string {
  const path = viewPaths[route.view];

  if (route.view === "research") {
    return route.researchProjectId
      ? `/${path}/${encodeURIComponent(route.researchProjectId)}`
      : `/${path}`;
  }

  if (route.view === "skills") {
    return route.skillId
      ? `/${path}/${encodeURIComponent(route.skillId)}`
      : `/${path}`;
  }


  if (route.view === "mission") {
    return route.missionId
      ? `/${path}/${encodeURIComponent(route.missionId)}`
      : "/today";
  }

  if (route.yandexMockDayId) {
    return `/${path}/mock/${encodeURIComponent(route.yandexMockDayId)}`;
  }

  if (route.dayReader) {
    const dayPath = `/${path}/day/${encodeURIComponent(route.dayReader.dayId)}`;
    if (!route.lessonReader) return dayPath;
    return `${dayPath}/lesson/${encodeURIComponent(route.lessonReader.itemId)}`;
  }

  if (!route.lessonReader) return `/${path}`;

  return `/${path}/lesson/${encodeURIComponent(route.lessonReader.itemId)}`;
}

export function formatAppRoute(route: AppRoute): string {
  return `#${formatAppPath(route)}`;
}

export function viewForTrack(track: TrackKey): AppView {
  return trackViews[track];
}
