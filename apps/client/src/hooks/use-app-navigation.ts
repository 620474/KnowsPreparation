import { useCallback, useEffect, useRef, useState } from "react";

import { buildAiChatDraft } from "../lib/ai-chat-draft";
import {
  formatAppRoute,
  parseAppRoute,
  viewForLessonScope,
  type AppRoute,
  type AppView,
  type LessonRouteTarget,
} from "../lib/app-route";
import type { AiChatScope, AiLessonQuestionContext } from "../types";

type NavigationMode = "push" | "replace";

export function useAppNavigation() {
  const [activeView, setActiveView] = useState<AppView>(
    () => parseAppRoute(window.location.hash).view,
  );
  const [lessonReader, setLessonReader] = useState<LessonRouteTarget | null>(
    () => parseAppRoute(window.location.hash).lessonReader,
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
        ? `${route.lessonReader.scope}:${route.lessonReader.itemId}`
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
    (scope: AiChatScope, itemId: string) =>
      navigateToRoute({
        view: viewForLessonScope(scope),
        lessonReader: { scope, itemId },
      }),
    [navigateToRoute],
  );

  const closeLessonReader = useCallback(() => {
    const marker = lessonReader
      ? `${lessonReader.scope}:${lessonReader.itemId}`
      : undefined;
    if (marker && window.history.state?.lessonReader === marker) {
      window.history.back();
      return;
    }
    navigateToView(activeView, "replace");
  }, [activeView, lessonReader, navigateToView]);

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
    chatOpen,
    chatItemId,
    chatDraftRequest,
    setChatItemId,
    navigateToView,
    navigateToLesson,
    openLessonReader: navigateToLesson,
    closeLessonReader,
    openChat,
    closeChat,
    resetChat,
  };
}
