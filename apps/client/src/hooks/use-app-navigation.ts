import { useCallback, useEffect, useRef, useState } from "react";

import { buildAiChatDraft } from "../lib/ai-chat-draft";
import {
  formatAppRoute,
  parseAppRoute,
  viewForTrack,
  type AppRoute,
  type AppView,
  type LessonRouteTarget,
} from "../lib/app-route";
import type { TrackKey, AiLessonQuestionContext } from "../types";

type NavigationMode = "push" | "replace";

export function useAppNavigation() {
  const [activeView, setActiveView] = useState<AppView>(
    () => parseAppRoute(window.location.hash).view,
  );
  const [lessonReader, setLessonReader] = useState<LessonRouteTarget | null>(
    () => parseAppRoute(window.location.hash).lessonReader,
  );
  const [planDayId, setPlanDayId] = useState<string | null>(
    () => parseAppRoute(window.location.hash).planDayId ?? null,
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [chatItemId, setChatItemId] = useState<string | null>(null);
  const [chatDraftRequest, setChatDraftRequest] = useState<{
    id: number;
    content: string;
  } | null>(null);
  const chatRequestIdRef = useRef(0);
  const readingScrollRef = useRef(0);

  useEffect(() => {
    const syncRoute = () => {
      const route = parseAppRoute(window.location.hash);
      setActiveView(route.view);
      setLessonReader(route.lessonReader);
      setPlanDayId(route.planDayId ?? null);
      setChatOpen(false);
      setChatItemId(route.lessonReader?.itemId ?? null);
      setChatDraftRequest(null);
    };

    const initialRoute = parseAppRoute(window.location.hash);
    const canonicalHash = formatAppRoute(initialRoute);
    if (window.location.hash !== canonicalHash) {
      window.history.replaceState(window.history.state, "", canonicalHash);
    }

    window.addEventListener("popstate", syncRoute);
    window.addEventListener("hashchange", syncRoute);
    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  const navigateToRoute = useCallback(
    (route: AppRoute, mode: NavigationMode = "push") => {
      const lessonMarker = route.lessonReader
        ? `${route.lessonReader.track}:${route.lessonReader.itemId}`
        : undefined;
      const historyState = { ...(window.history.state ?? {}), lessonReader: lessonMarker };
      const hash = formatAppRoute(route);
      const navigationMode = window.location.hash === hash ? "replace" : mode;

      if (navigationMode === "replace") {
        window.history.replaceState(historyState, "", hash);
      } else {
        window.history.pushState(historyState, "", hash);
      }

      setActiveView(route.view);
      setLessonReader(route.lessonReader);
      setPlanDayId(route.planDayId ?? null);
      setChatOpen(false);
      setChatItemId(route.lessonReader?.itemId ?? null);
      setChatDraftRequest(null);
    },
    [],
  );

  const navigateToView = useCallback(
    (view: AppView, mode: NavigationMode = "push") =>
      navigateToRoute({ view, lessonReader: null }, mode),
    [navigateToRoute],
  );

  const navigateToLesson = useCallback(
    (track: TrackKey, itemId: string) =>
      navigateToRoute({
        view: viewForTrack(track),
        lessonReader: { track, itemId },
        ...(track === "curriculum" && planDayId ? { planDayId } : {}),
      }),
    [navigateToRoute, planDayId],
  );

  const navigateToPlanDay = useCallback(
    (dayId: string) =>
      navigateToRoute({
        view: "plan",
        lessonReader: null,
        planDayId: dayId,
      }),
    [navigateToRoute],
  );

  const closeLessonReader = useCallback(() => {
    const marker = lessonReader
      ? `${lessonReader.track}:${lessonReader.itemId}`
      : undefined;
    if (marker && window.history.state?.lessonReader === marker) {
      window.history.back();
      return;
    }
    navigateToRoute(
      {
        view: activeView,
        lessonReader: null,
        ...(planDayId ? { planDayId } : {}),
      },
      "replace",
    );
  }, [activeView, lessonReader, navigateToRoute, planDayId]);

  const openChat = useCallback(
    (itemId: string | null, context?: AiLessonQuestionContext) => {
      readingScrollRef.current = window.scrollY;
      if (itemId) setChatItemId(itemId);
      if (context) {
        chatRequestIdRef.current += 1;
        setChatDraftRequest({
          id: chatRequestIdRef.current,
          content: buildAiChatDraft(context),
        });
      }
      setChatOpen(true);
    },
    [],
  );

  const closeChat = useCallback(() => {
    const scrollTop = readingScrollRef.current;
    setChatOpen(false);
    window.setTimeout(() => window.scrollTo(0, scrollTop), 250);
  }, []);

  const resetChat = useCallback(() => {
    setChatItemId(null);
    setChatOpen(false);
  }, []);

  return {
    activeView,
    lessonReader,
    planDayId,
    chatOpen,
    chatItemId,
    chatDraftRequest,
    setChatItemId,
    navigateToView,
    navigateToLesson,
    navigateToPlanDay,
    openLessonReader: navigateToLesson,
    closeLessonReader,
    openChat,
    closeChat,
    resetChat,
  };
}
