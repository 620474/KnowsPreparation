import { Navigate, createHashRouter } from "react-router-dom";

import App from "./App";

const applicationPaths = [
  "today",
  "preparation",
  "knowledge",
  "yandex",
  "yandex/lesson/:itemId",
  "yandex/day/:dayId",
  "yandex/day/:dayId/lesson/:itemId",
  "yandex/mock/:dayId",
  "ozon",
  "ozon/lesson/:itemId",
  "ozon/day/:dayId",
  "ozon/day/:dayId/lesson/:itemId",
  "ai",
  "ai/lesson/:itemId",
  "plan",
  "plan/lesson/:itemId",
  "plan/day/:dayId",
  "plan/day/:dayId/lesson/:itemId",
  "resources",
  "questions",
  "review",
  "mock-interview",
  "interview",
  "analytics",
  "research",
  "research/:projectId",
  "algorithms",
  "settings",
] as const;

export const appRouter = createHashRouter([
  { path: "/", element: <Navigate replace to="/today" /> },
  {
    element: <App />,
    children: applicationPaths.map((path) => ({ path })),
  },
  { path: "*", element: <Navigate replace to="/today" /> },
]);
