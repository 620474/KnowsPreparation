import type { TrackKey } from "../types";

export type AppView =
  | "today"
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
}

const DEFAULT_ROUTE: AppRoute = { view: "yandex", lessonReader: null };

const viewPaths: Record<AppView, string> = {
  today: "today",
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

export function parseAppRoute(hash: string): AppRoute {
  const path = hash.replace(/^#/, "");
  const segments = path.split("/").filter(Boolean);
  const view = pathViews[segments[0] ?? ""];
  if (!view) return DEFAULT_ROUTE;

  const track = viewTracks[view];
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

export function formatAppRoute(route: AppRoute): string {
  const path = viewPaths[route.view];

  if (route.dayReader) {
    const dayPath = `#/${path}/day/${encodeURIComponent(route.dayReader.dayId)}`;
    if (!route.lessonReader) return dayPath;
    return `${dayPath}/lesson/${encodeURIComponent(route.lessonReader.itemId)}`;
  }

  if (!route.lessonReader) return `#/${path}`;

  return `#/${path}/lesson/${encodeURIComponent(route.lessonReader.itemId)}`;
}

export function viewForTrack(track: TrackKey): AppView {
  return trackViews[track];
}
