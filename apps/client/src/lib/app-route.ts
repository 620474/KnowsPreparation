import type { AiChatScope } from "../types";

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
  | "analytics"
  | "algorithms"
  | "settings";

export interface LessonRouteTarget {
  scope: AiChatScope;
  itemId: string;
}

export interface AppRoute {
  view: AppView;
  lessonReader: LessonRouteTarget | null;
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
  analytics: "analytics",
  algorithms: "algorithms",
  settings: "settings",
};

const pathViews = Object.fromEntries(
  Object.entries(viewPaths).map(([view, path]) => [path, view]),
) as Record<string, AppView>;

const lessonScopes: Partial<Record<AppView, AiChatScope>> = {
  yandex: "yandex",
  ozon: "ozon",
  "ai-course": "course",
};

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

  const scope = lessonScopes[view];
  const itemId = segments[1] === "lesson" && segments[2] ? decodeItemId(segments[2]) : "";

  return {
    view,
    lessonReader: scope && itemId ? { scope, itemId } : null,
  };
}

export function formatAppRoute(route: AppRoute): string {
  const path = viewPaths[route.view];
  if (!route.lessonReader) return `#/${path}`;

  return `#/${path}/lesson/${encodeURIComponent(route.lessonReader.itemId)}`;
}

export function viewForLessonScope(scope: AiChatScope): AppView {
  if (scope === "course") return "ai-course";
  return scope;
}
