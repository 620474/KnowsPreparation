import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { buildAiChatDraft } from "../lib/ai-chat-draft";
import {
  formatAppPath,
  parseAppPath,
  viewForTrack,
  type AppRoute,
  type AppView,
  type DayRouteTarget,
  type LessonRouteTarget,
} from "../lib/app-route";
import type { TrackKey, AiLessonQuestionContext } from "../types";

type NavigationMode = "push" | "replace";

interface AppNavigationState {
  lessonReader?: string;
  quizFocusItemId?: string;
}

interface ChatRouteState {
  routeKey: string;
  opened: boolean;
  itemId: string | null;
  draftRequest: { id: number; content: string } | null;
}

export function useAppNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(() => parseAppPath(location.pathname), [location.pathname]);
  const navigationState = (location.state ?? {}) as AppNavigationState;
  const [chatState, setChatState] = useState<ChatRouteState>(() => ({
    routeKey: location.key,
    opened: false,
    itemId: route.lessonReader?.itemId ?? null,
    draftRequest: null,
  }));
  const chatRequestIdRef = useRef(0);
  const readingScrollRef = useRef(0);
  const chatOnCurrentRoute = chatState.routeKey === location.key;
  const chatOpen = chatOnCurrentRoute && chatState.opened;
  const chatItemId = chatOnCurrentRoute
    ? chatState.itemId
    : route.lessonReader?.itemId ?? null;
  const chatDraftRequest = chatOnCurrentRoute ? chatState.draftRequest : null;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setChatState({
        routeKey: location.key,
        opened: false,
        itemId: route.lessonReader?.itemId ?? null,
        draftRequest: null,
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [location.key, route.lessonReader?.itemId]);

  const setChatItemId = useCallback(
    (itemId: string | null) =>
      setChatState((current) => ({
        routeKey: location.key,
        opened: current.routeKey === location.key && current.opened,
        itemId,
        draftRequest: current.routeKey === location.key ? current.draftRequest : null,
      })),
    [location.key],
  );

  const navigateToRoute = useCallback(
    (
      nextRoute: AppRoute,
      mode: NavigationMode = "push",
      state: AppNavigationState = {},
    ) => {
      const lessonMarker = nextRoute.lessonReader
        ? `${nextRoute.lessonReader.track}:${nextRoute.lessonReader.itemId}`
        : undefined;
      const path = formatAppPath(nextRoute);
      const replace = location.pathname === path || mode === "replace";

      navigate(path, {
        replace,
        state: {
          ...state,
          ...(lessonMarker ? { lessonReader: lessonMarker } : {}),
        },
      });
    },
    [location.pathname, navigate],
  );

  const navigateToView = useCallback(
    (view: AppView, mode: NavigationMode = "push") =>
      navigateToRoute({ view, lessonReader: null }, mode),
    [navigateToRoute],
  );

  const navigateToLesson = useCallback(
    (track: TrackKey, itemId: string, focusQuiz = false) => {
      const lessonMarker = `${track}:${itemId}`;
      navigateToRoute(
        {
          view: viewForTrack(track),
          lessonReader: { track, itemId },
          ...(route.dayReader?.track === track ? { dayReader: route.dayReader } : {}),
        },
        "push",
        focusQuiz ? { quizFocusItemId: lessonMarker } : {},
      );
    },
    [navigateToRoute, route.dayReader],
  );

  const navigateToTrackDay = useCallback(
    (track: DayRouteTarget["track"], dayId: string) =>
      navigateToRoute({
        view: viewForTrack(track),
        lessonReader: null,
        dayReader: { track, dayId },
      }),
    [navigateToRoute],
  );

  const navigateToYandexMock = useCallback(
    (dayId: string) =>
      navigateToRoute({
        view: "yandex",
        lessonReader: null,
        dayReader: { track: "yandex", dayId },
        yandexMockDayId: dayId,
      }),
    [navigateToRoute],
  );

  const navigateToResearchProject = useCallback(
    (projectId: string | null) =>
      navigateToRoute({
        view: "research",
        lessonReader: null,
        researchProjectId: projectId,
      }),
    [navigateToRoute],
  );

  const navigateToSkill = useCallback(
    (skillId: string | null) =>
      navigateToRoute({ view: "skills", lessonReader: null, skillId }),
    [navigateToRoute],
  );

  const closeLessonReader = useCallback(() => {
    const marker = route.lessonReader
      ? `${route.lessonReader.track}:${route.lessonReader.itemId}`
      : undefined;
    if (marker && navigationState.lessonReader === marker) {
      navigate(-1);
      return;
    }
    navigateToRoute(
      {
        view: route.view,
        lessonReader: null,
        ...(route.dayReader ? { dayReader: route.dayReader } : {}),
      },
      "replace",
    );
  }, [navigate, navigateToRoute, navigationState.lessonReader, route]);

  const openChat = useCallback(
    (itemId: string | null, context?: AiLessonQuestionContext) => {
      readingScrollRef.current = window.scrollY;
      let draftRequest: ChatRouteState["draftRequest"] = null;
      if (context) {
        chatRequestIdRef.current += 1;
        draftRequest = {
          id: chatRequestIdRef.current,
          content: buildAiChatDraft(context),
        };
      }
      setChatState((current) => ({
        routeKey: location.key,
        opened: true,
        itemId: itemId ?? (current.routeKey === location.key ? current.itemId : null),
        draftRequest,
      }));
    },
    [location.key],
  );

  const openChatWithDraft = useCallback(
    (itemId: string, content: string) => {
      readingScrollRef.current = window.scrollY;
      chatRequestIdRef.current += 1;
      setChatState({
        routeKey: location.key,
        opened: true,
        itemId,
        draftRequest: { id: chatRequestIdRef.current, content },
      });
    },
    [location.key],
  );

  const closeChat = useCallback(() => {
    const scrollTop = readingScrollRef.current;
    setChatState((current) => ({ ...current, opened: false }));
    window.setTimeout(() => window.scrollTo(0, scrollTop), 250);
  }, []);

  const resetChat = useCallback(() => {
    setChatState({
      routeKey: location.key,
      opened: false,
      itemId: null,
      draftRequest: null,
    });
  }, [location.key]);

  return {
    activeView: route.view,
    lessonReader: route.lessonReader as LessonRouteTarget | null,
    quizFocusItemId: navigationState.quizFocusItemId ?? null,
    dayReader: route.dayReader ?? null,
    yandexMockDayId: route.yandexMockDayId ?? null,
    researchProjectId: route.researchProjectId ?? null,
    skillId: route.skillId ?? null,
    chatOpen,
    chatItemId,
    chatDraftRequest,
    setChatItemId,
    navigateToView,
    navigateToLesson,
    navigateToTrackDay,
    navigateToYandexMock,
    navigateToResearchProject,
    navigateToSkill,
    openLessonReader: navigateToLesson,
    closeLessonReader,
    openChat,
    openChatWithDraft,
    closeChat,
    resetChat,
  };
}
