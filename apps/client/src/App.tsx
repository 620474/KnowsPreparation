import { useEffect, useRef, useState } from "react";
import { Alert, Button, Loader } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import {
  clearSession,
  getToken,
  learningApi,
  UNAUTHORIZED_EVENT,
} from "./api";
import { AppShell } from "./components/AppShell";
import { AiChatWidget } from "./components/AiChatWidget";
import { AiLessonReader } from "./components/AiLessonReader";
import { LoginScreen } from "./components/LoginScreen";
import { buildAiChatDraft } from "./lib/ai-chat-draft";
import { useOnlineStatus } from "./lib/network";
import { clearPersistedQueryCache } from "./lib/query-cache";
import {
  formatAppRoute,
  parseAppRoute,
  viewForLessonScope,
  type AppRoute,
  type AppView,
  type LessonRouteTarget,
} from "./lib/app-route";
import { getStudyPosition } from "./lib/date";
import type {
  AlgorithmEntry,
  AiChatScope,
  AiCourse,
  AiCourseProfile,
  AiLesson,
  AiLessonQuestionContext,
  BootstrapData,
  LessonQuizProgress,
  MockInterview,
  QuestionProgress,
  ReviewRating,
  TaskProgress,
  TaskProgressPatch,
} from "./types";
import { AlgorithmsView } from "./views/AlgorithmsView";
import { AiCourseView } from "./views/AiCourseView";
import { AnalyticsView } from "./views/AnalyticsView";
import { MockInterviewView } from "./views/MockInterviewView";
import { PlanView } from "./views/PlanView";
import { OzonSprintView } from "./views/OzonSprintView";
import { QuestionsView } from "./views/QuestionsView";
import { ReviewView } from "./views/ReviewView";
import { ResourcesView } from "./views/ResourcesView";
import { SettingsView } from "./views/SettingsView";
import { TodayView } from "./views/TodayView";
import { YandexSprintView } from "./views/YandexSprintView";

const BOOTSTRAP_KEY = ["bootstrap"] as const;
type MutationContext = { previous?: BootstrapData };
type TaskMutationVariables = { taskId: string; progress: TaskProgressPatch };
type QuestionMutationVariables = { questionId: string; progress: QuestionProgress };
type ReviewMutationVariables = { questionId: string; rating: ReviewRating; note: string };
type QuizMutationVariables = {
  scope: AiChatScope;
  itemId: string;
  answers: Array<{ questionId: string; selectedOptionIndex: number }>;
};
type NavigationMode = "push" | "replace";

const updateMockInterviews = (
  current: BootstrapData,
  interview: MockInterview,
): BootstrapData => ({
  ...current,
  mockInterviews: [
    interview,
    ...current.mockInterviews.filter((item) => item.id !== interview.id),
  ].slice(0, 20),
});

export default function App() {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [activeView, setActiveView] = useState<AppView>(
    () => parseAppRoute(window.location.hash).view,
  );
  const [syncError, setSyncError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatItemId, setChatItemId] = useState<string | null>(null);
  const [lessonReader, setLessonReader] = useState<LessonRouteTarget | null>(
    () => parseAppRoute(window.location.hash).lessonReader,
  );
  const [chatDraftRequest, setChatDraftRequest] = useState<{
    id: number;
    content: string;
  } | null>(null);
  const chatRequestIdRef = useRef(0);
  const readingScrollRef = useRef(0);
  const [generationProgress, setGenerationProgress] = useState<{
    scope: AiChatScope;
    itemId: string;
    characters: number;
  } | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => setAuthenticated(false);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

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

  const bootstrapQuery = useQuery({
    queryKey: BOOTSTRAP_KEY,
    queryFn: learningApi.bootstrap,
    enabled: authenticated,
    refetchInterval: online ? 60_000 : false,
    refetchOnWindowFocus: true,
  });

  const taskMutation = useMutation<
    TaskProgress & { taskId: string },
    Error,
    TaskMutationVariables,
    MutationContext
  >({
    mutationFn: ({ taskId, progress }) =>
      learningApi.updateTask(taskId, progress),
    onMutate: async ({ taskId, progress }) => {
      await queryClient.cancelQueries({ queryKey: BOOTSTRAP_KEY });
      const previous = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_KEY);
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current: BootstrapData | undefined) =>
        current
          ? {
              ...current,
              progress: {
                ...current.progress,
                tasks: {
                  ...current.progress.tasks,
                  [taskId]: {
                    completed: false,
                    note: "",
                    customTask: "",
                    solution: "",
                    ...current.progress.tasks[taskId],
                    ...progress,
                  },
                },
              },
            }
          : current,
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(BOOTSTRAP_KEY, context.previous);
      setSyncError(error instanceof Error ? error.message : "Не удалось сохранить задание");
    },
  });

  const generateAiCourseMutation = useMutation<AiCourse, Error, AiCourseProfile>({
    mutationFn: learningApi.generateAiCourse,
    onSuccess: (course) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current) =>
        current
          ? { ...current, ai: { ...current.ai, course, lessons: {} } }
          : current,
      );
      queryClient.removeQueries({ queryKey: ["ai-chat", "course"] });
      setChatItemId(null);
      setChatOpen(false);
      navigateToView("ai-course", "replace");
    },
    onError: (error) => setSyncError(error.message),
  });

  const generateAiLessonMutation = useMutation<AiLesson, Error, string>({
    mutationFn: (itemId) => {
      setGenerationProgress({ scope: "course", itemId, characters: 0 });
      return learningApi.generateAiLessonStream("course", itemId, (delta) =>
        setGenerationProgress((current) =>
          current?.scope === "course" && current.itemId === itemId
            ? { ...current, characters: current.characters + delta.length }
            : current,
        ),
      );
    },
    onSuccess: (lesson) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current) =>
        current
          ? {
              ...current,
              ai: {
                ...current.ai,
                lessons: { ...current.ai.lessons, [lesson.itemId]: lesson },
              },
            }
          : current,
      );
      navigateToLesson("course", lesson.itemId);
    },
    onError: (error) => setSyncError(error.message),
    onSettled: () => setGenerationProgress(null),
  });

  const generateYandexLessonMutation = useMutation<AiLesson, Error, string>({
    mutationFn: (itemId) => {
      setGenerationProgress({ scope: "yandex", itemId, characters: 0 });
      return learningApi.generateAiLessonStream("yandex", itemId, (delta) =>
        setGenerationProgress((current) =>
          current?.scope === "yandex" && current.itemId === itemId
            ? { ...current, characters: current.characters + delta.length }
            : current,
        ),
      );
    },
    onSuccess: (lesson) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current) =>
        current
          ? {
              ...current,
              ai: {
                ...current.ai,
                yandexLessons: {
                  ...current.ai.yandexLessons,
                  [lesson.itemId]: lesson,
                },
              },
            }
          : current,
      );
      navigateToLesson("yandex", lesson.itemId);
    },
    onError: (error) => setSyncError(error.message),
    onSettled: () => setGenerationProgress(null),
  });

  const generateOzonLessonMutation = useMutation<AiLesson, Error, string>({
    mutationFn: (itemId) => {
      setGenerationProgress({ scope: "ozon", itemId, characters: 0 });
      return learningApi.generateAiLessonStream("ozon", itemId, (delta) =>
        setGenerationProgress((current) =>
          current?.scope === "ozon" && current.itemId === itemId
            ? { ...current, characters: current.characters + delta.length }
            : current,
        ),
      );
    },
    onSuccess: (lesson) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current) =>
        current
          ? {
              ...current,
              ai: {
                ...current.ai,
                ozonLessons: {
                  ...current.ai.ozonLessons,
                  [lesson.itemId]: lesson,
                },
              },
            }
          : current,
      );
      navigateToLesson("ozon", lesson.itemId);
    },
    onError: (error) => setSyncError(error.message),
    onSettled: () => setGenerationProgress(null),
  });

  const questionMutation = useMutation<
    QuestionProgress & { questionId: string },
    Error,
    QuestionMutationVariables,
    MutationContext
  >({
    mutationFn: ({ questionId, progress }) => learningApi.updateQuestion(questionId, progress),
    onMutate: async ({ questionId, progress }) => {
      await queryClient.cancelQueries({ queryKey: BOOTSTRAP_KEY });
      const previous = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_KEY);
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current: BootstrapData | undefined) =>
        current
          ? {
              ...current,
              progress: {
                ...current.progress,
                questions: { ...current.progress.questions, [questionId]: progress },
              },
            }
          : current,
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(BOOTSTRAP_KEY, context.previous);
      setSyncError(error instanceof Error ? error.message : "Не удалось сохранить вопрос");
    },
  });

  const reviewMutation = useMutation<
    QuestionProgress & { questionId: string },
    Error,
    ReviewMutationVariables
  >({
    mutationFn: ({ questionId, rating, note }) =>
      learningApi.reviewQuestion(questionId, rating, note),
    onSuccess: ({ questionId, ...progress }) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current) =>
        current
          ? {
              ...current,
              progress: {
                ...current.progress,
                questions: { ...current.progress.questions, [questionId]: progress },
              },
            }
          : current,
      );
    },
    onError: (error) => setSyncError(error.message),
  });

  const quizMutation = useMutation<LessonQuizProgress, Error, QuizMutationVariables>({
    mutationFn: ({ scope, itemId, answers }) =>
      learningApi.submitLessonQuiz(scope, itemId, answers),
    onSuccess: (progress, { scope, itemId }) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current) =>
        current
          ? {
              ...current,
              ai: {
                ...current.ai,
                quizProgress: {
                  ...current.ai.quizProgress,
                  [scope]: {
                    ...current.ai.quizProgress[scope],
                    [itemId]: progress,
                  },
                },
              },
            }
          : current,
      );
    },
    onError: (error) => setSyncError(error.message),
  });

  const startMockMutation = useMutation<MockInterview, Error>({
    mutationFn: learningApi.startMockInterview,
    onSuccess: (interview) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current) =>
        current ? updateMockInterviews(current, interview) : current,
      );
    },
    onError: (error) => setSyncError(error.message),
  });

  const saveMockAnswerMutation = useMutation<
    MockInterview,
    Error,
    { interviewId: string; questionId: string; content: string }
  >({
    mutationFn: ({ interviewId, questionId, content }) =>
      learningApi.updateMockAnswer(interviewId, questionId, content),
    onSuccess: (interview) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current) =>
        current ? updateMockInterviews(current, interview) : current,
      );
    },
    onError: (error) => setSyncError(error.message),
  });

  const completeMockMutation = useMutation<MockInterview, Error, string>({
    mutationFn: learningApi.completeMockInterview,
    onSuccess: (interview) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current) =>
        current ? updateMockInterviews(current, interview) : current,
      );
    },
    onError: (error) => setSyncError(error.message),
  });

  const settingsMutation = useMutation<{ startDate: string }, Error, string>({
    mutationFn: learningApi.updateSettings,
    onSuccess: ({ startDate }) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current: BootstrapData | undefined) =>
        current ? { ...current, settings: { ...current.settings, startDate } } : current,
      );
      navigateToView("today");
    },
    onError: (error) =>
      setSyncError(error instanceof Error ? error.message : "Не удалось сохранить дату"),
  });

  const addAlgorithmMutation = useMutation<
    AlgorithmEntry,
    Error,
    Omit<AlgorithmEntry, "id">
  >({
    mutationFn: learningApi.addAlgorithm,
    onSuccess: (entry) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current: BootstrapData | undefined) =>
        current ? { ...current, algorithms: [entry, ...current.algorithms] } : current,
      );
    },
    onError: (error) =>
      setSyncError(error instanceof Error ? error.message : "Не удалось добавить задачу"),
  });

  const deleteAlgorithmMutation = useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: learningApi.deleteAlgorithm,
    onSuccess: (_result, id) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current: BootstrapData | undefined) =>
        current
          ? { ...current, algorithms: current.algorithms.filter((entry) => entry.id !== id) }
          : current,
      );
    },
    onError: (error) =>
      setSyncError(error instanceof Error ? error.message : "Не удалось удалить задачу"),
  });

  function logout() {
    clearSession();
    queryClient.clear();
    void clearPersistedQueryCache();
    setAuthenticated(false);
  }

  if (!authenticated) {
    return (
      <LoginScreen
        onSuccess={() => {
          setAuthenticated(true);
          void queryClient.invalidateQueries({ queryKey: BOOTSTRAP_KEY });
        }}
      />
    );
  }

  if (bootstrapQuery.isPending && !bootstrapQuery.data) {
    return (
      <main className="state-page">
        <Loader color="mint" size="lg" />
        <h1>Собираю твой план</h1>
        <p>Загружаю прогресс из общей базы…</p>
      </main>
    );
  }

  if (!bootstrapQuery.data) {
    return (
      <main className="state-page error-state">
        <AlertTriangle size={36} />
        <h1>API пока недоступен</h1>
        <p>{bootstrapQuery.error?.message ?? "Проверь адрес API и подключение к интернету."}</p>
        <div className="state-actions">
          <Button
            className="primary-button"
            type="button"
            leftSection={<RefreshCw size={18} />}
            onClick={() => void bootstrapQuery.refetch()}
          >
            Повторить
          </Button>
          <Button className="secondary-button" type="button" variant="default" onClick={logout}>
            Сменить подключение
          </Button>
        </div>
      </main>
    );
  }

  const data = bootstrapQuery.data;
  const courseChatTopics =
    data.ai.course?.items.map((item) => ({
      id: item.id,
      title: item.title,
      objective: item.objective,
    })) ?? [];
  const yandexChatTopics = data.yandexSprint.flatMap((day) =>
    day.blocks
      .filter((block) => block.kind !== "review")
      .map((block) => ({
        id: block.id,
        title: block.title,
        objective: `${day.title}. ${block.description}`,
      })),
  );
  const ozonChatTopics = data.ozonSprint.flatMap((day) =>
    day.blocks
      .filter((block) => block.kind !== "review")
      .map((block) => ({
        id: block.id,
        title: block.title,
        objective: `${day.title}. ${block.description}`,
      })),
  );
  const readerCourseItem =
    lessonReader?.scope === "course"
      ? data.ai.course?.items.find((item) => item.id === lessonReader.itemId)
      : undefined;
  const readerYandexEntry =
    lessonReader?.scope === "yandex"
      ? data.yandexSprint
          .flatMap((day) => day.blocks.map((block) => ({ day, block })))
          .find(({ block }) => block.id === lessonReader.itemId)
      : undefined;
  const readerOzonEntry =
    lessonReader?.scope === "ozon"
      ? data.ozonSprint
          .flatMap((day) => day.blocks.map((block) => ({ day, block })))
          .find(({ block }) => block.id === lessonReader.itemId)
      : undefined;
  const readerLesson = lessonReader
    ? lessonReader.scope === "yandex"
      ? data.ai.yandexLessons[lessonReader.itemId]
      : lessonReader.scope === "ozon"
        ? data.ai.ozonLessons[lessonReader.itemId]
        : data.ai.lessons[lessonReader.itemId]
    : undefined;
  const readerQuizProgress = lessonReader
    ? data.ai.quizProgress[lessonReader.scope]?.[lessonReader.itemId]
    : undefined;
  const readerMetadata = readerCourseItem
    ? {
        eyebrow: "Персональный AI-курс",
        title: readerCourseItem.title,
        description: readerCourseItem.objective,
        resourceIds: readerCourseItem.resourceIds,
      }
    : readerYandexEntry
      ? {
          eyebrow: `Яндекс · день ${readerYandexEntry.day.dayNumber}`,
          title: readerYandexEntry.block.title,
          description: readerYandexEntry.block.description,
          resourceIds: readerYandexEntry.block.resourceIds,
        }
      : readerOzonEntry
        ? {
            eyebrow: `Ozon · день ${readerOzonEntry.day.dayNumber}`,
            title: readerOzonEntry.block.title,
            description: readerOzonEntry.block.description,
            resourceIds: readerOzonEntry.block.resourceIds,
          }
      : undefined;
  const chatScope =
    lessonReader?.scope ??
    (activeView === "yandex" ? "yandex" : activeView === "ozon" ? "ozon" : "course");
  const chatTopics = lessonReader
    ? lessonReader.scope === "yandex"
      ? yandexChatTopics
      : lessonReader.scope === "ozon"
        ? ozonChatTopics
        : courseChatTopics
    : activeView === "yandex"
      ? yandexChatTopics
      : activeView === "ozon"
        ? ozonChatTopics
        : activeView === "ai-course"
          ? courseChatTopics
          : [];
  const generatedChatLessons =
    chatScope === "yandex"
      ? data.ai.yandexLessons
      : chatScope === "ozon"
        ? data.ai.ozonLessons
        : data.ai.lessons;
  const fallbackChatItemId =
    chatTopics.find((item) => generatedChatLessons[item.id])?.id ?? chatTopics[0]?.id ?? null;
  const activeChatItemId =
    chatItemId && chatTopics.some((item) => item.id === chatItemId)
      ? chatItemId
      : fallbackChatItemId;
  const position = getStudyPosition(data.settings.startDate);
  const safeWeek = Math.min(Math.max(position.weekNumber, 1), data.curriculum.length);
  const weekLabel = `Неделя ${safeWeek} из ${data.curriculum.length}`;
  const updateTask = async (taskId: string, progress: TaskProgressPatch) => {
    setSyncError("");
    try {
      await taskMutation.mutateAsync({ taskId, progress });
      return true;
    } catch {
      return false;
    }
  };
  const updateQuestion = (questionId: string, progress: QuestionProgress) => {
    setSyncError("");
    questionMutation.mutate({ questionId, progress });
  };
  const reviewQuestion = async (questionId: string, rating: ReviewRating, note: string) => {
    setSyncError("");
    try {
      await reviewMutation.mutateAsync({ questionId, rating, note });
      return true;
    } catch {
      return false;
    }
  };
  const submitLessonQuiz = async (
    scope: AiChatScope,
    itemId: string,
    answers: QuizMutationVariables["answers"],
  ) => {
    setSyncError("");
    try {
      return await quizMutation.mutateAsync({ scope, itemId, answers });
    } catch {
      return null;
    }
  };
  const startMockInterview = async () => {
    setSyncError("");
    try {
      return await startMockMutation.mutateAsync();
    } catch {
      return null;
    }
  };
  const saveMockAnswer = async (
    interviewId: string,
    questionId: string,
    content: string,
  ) => {
    setSyncError("");
    try {
      return await saveMockAnswerMutation.mutateAsync({ interviewId, questionId, content });
    } catch {
      return null;
    }
  };
  const completeMockInterview = async (interviewId: string) => {
    setSyncError("");
    try {
      return await completeMockMutation.mutateAsync(interviewId);
    } catch {
      return null;
    }
  };
  const addAlgorithm = (entry: Omit<AlgorithmEntry, "id">) => {
    setSyncError("");
    addAlgorithmMutation.mutate(entry);
  };
  function navigateToRoute(route: AppRoute, mode: NavigationMode = "push") {
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
  }

  function navigateToView(view: AppView, mode: NavigationMode = "push") {
    navigateToRoute({ view, lessonReader: null }, mode);
  }

  function navigateToLesson(scope: AiChatScope, itemId: string) {
    navigateToRoute({
      view: viewForLessonScope(scope),
      lessonReader: { scope, itemId },
    });
  }

  const openLessonReader = (scope: AiChatScope, itemId: string) => {
    navigateToLesson(scope, itemId);
  };
  const closeLessonReader = () => {
    const marker = lessonReader ? `${lessonReader.scope}:${lessonReader.itemId}` : undefined;
    if (marker && window.history.state?.lessonReader === marker) {
      window.history.back();
      return;
    }
    navigateToView(activeView, "replace");
  };
  const openChat = (itemId: string | null, context?: AiLessonQuestionContext) => {
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
  };
  const closeChat = () => {
    const scrollTop = readingScrollRef.current;
    setChatOpen(false);
    window.setTimeout(() => window.scrollTo(0, scrollTop), 250);
  };

  return (
    <AppShell
      activeView={activeView}
      onViewChange={navigateToView}
      weekLabel={weekLabel}
    >
      {!online || bootstrapQuery.isError ? (
        <Alert className="offline-alert" color="yellow" icon={<WifiOff size={17} />} variant="light">
          Офлайн-режим: показываю сохранённые данные. Для изменений и AI нужен интернет.
        </Alert>
      ) : null}
      {syncError ? (
        <Alert
          className="sync-error"
          color="red"
          icon={<AlertTriangle size={17} />}
          variant="light"
          withCloseButton
          closeButtonLabel="Закрыть сообщение"
          onClose={() => setSyncError("")}
        >
          {syncError}
        </Alert>
      ) : null}
      {activeView === "today" ? (
        <TodayView
          data={data}
          onOpenAnalytics={() => navigateToView("analytics")}
          onOpenMock={() => navigateToView("mock-interview")}
          onOpenReview={() => navigateToView("review")}
          onUpdateTask={updateTask}
        />
      ) : null}
      {activeView === "yandex" ? (
        <YandexSprintView
          data={data}
          generatingLessonId={
            generateYandexLessonMutation.isPending
              ? (generateYandexLessonMutation.variables ?? null)
              : null
          }
          generationCharacters={
            generationProgress?.scope === "yandex" ? generationProgress.characters : 0
          }
          onGenerateLesson={(blockId) => {
            setSyncError("");
            generateYandexLessonMutation.mutate(blockId);
          }}
          onOpenLesson={(blockId) => openLessonReader("yandex", blockId)}
          onOpenChat={(blockId, context) => openChat(blockId, context)}
          onUpdateTask={updateTask}
        />
      ) : null}
      {activeView === "ozon" ? (
        <OzonSprintView
          data={data}
          generatingLessonId={
            generateOzonLessonMutation.isPending
              ? (generateOzonLessonMutation.variables ?? null)
              : null
          }
          generationCharacters={
            generationProgress?.scope === "ozon" ? generationProgress.characters : 0
          }
          onGenerateLesson={(blockId) => {
            setSyncError("");
            generateOzonLessonMutation.mutate(blockId);
          }}
          onOpenLesson={(blockId) => openLessonReader("ozon", blockId)}
          onOpenChat={(blockId, context) => openChat(blockId, context)}
          onUpdateTask={updateTask}
        />
      ) : null}
      {activeView === "ai-course" ? (
        <AiCourseView
          data={data}
          generatingCourse={generateAiCourseMutation.isPending}
          generatingLessonId={
            generateAiLessonMutation.isPending
              ? (generateAiLessonMutation.variables ?? null)
              : null
          }
          generationCharacters={
            generationProgress?.scope === "course" ? generationProgress.characters : 0
          }
          onGenerateCourse={(profile) => {
            setSyncError("");
            generateAiCourseMutation.mutate(profile);
          }}
          onGenerateLesson={(itemId) => {
            setSyncError("");
            generateAiLessonMutation.mutate(itemId);
          }}
          onOpenLesson={(itemId) => openLessonReader("course", itemId)}
          onOpenChat={(itemId, context) => openChat(itemId, context)}
        />
      ) : null}
      {activeView === "plan" ? <PlanView data={data} onUpdateTask={updateTask} /> : null}
      {activeView === "resources" ? <ResourcesView data={data} /> : null}
      {activeView === "questions" ? (
        <QuestionsView
          data={data}
          onOpenAnalytics={() => navigateToView("analytics")}
          onOpenMock={() => navigateToView("mock-interview")}
          onOpenReview={() => navigateToView("review")}
          onUpdateQuestion={updateQuestion}
        />
      ) : null}
      {activeView === "review" ? (
        <ReviewView
          data={data}
          onBack={() => navigateToView("today")}
          onReview={reviewQuestion}
        />
      ) : null}
      {activeView === "mock-interview" ? (
        <MockInterviewView
          data={data}
          onBack={() => navigateToView("questions")}
          onComplete={completeMockInterview}
          onSaveAnswer={saveMockAnswer}
          onStart={startMockInterview}
        />
      ) : null}
      {activeView === "analytics" ? (
        <AnalyticsView
          data={data}
          onBack={() => navigateToView("questions")}
          onOpenMock={() => navigateToView("mock-interview")}
          onOpenReview={() => navigateToView("review")}
        />
      ) : null}
      {activeView === "algorithms" ? (
        <AlgorithmsView
          data={data}
          onAdd={addAlgorithm}
          onDelete={(id) => deleteAlgorithmMutation.mutate(id)}
          onUpdateTask={updateTask}
        />
      ) : null}
      {activeView === "settings" ? (
        <SettingsView
          data={data}
          onOpenOzon={() => navigateToView("ozon")}
          onUpdateStartDate={(startDate) => settingsMutation.mutate(startDate)}
          onLogout={logout}
        />
      ) : null}
      {lessonReader && readerLesson && readerMetadata ? (
        <AiLessonReader
          description={readerMetadata.description}
          eyebrow={readerMetadata.eyebrow}
          isRegenerating={
            lessonReader.scope === "yandex"
              ? generateYandexLessonMutation.isPending
              : lessonReader.scope === "ozon"
                ? generateOzonLessonMutation.isPending
                : generateAiLessonMutation.isPending
          }
          lesson={readerLesson}
          quizProgress={readerQuizProgress}
          resourceIds={readerMetadata.resourceIds}
          resources={data.resources}
          title={readerMetadata.title}
          onAsk={(context) => openChat(lessonReader.itemId, context)}
          onBack={closeLessonReader}
          onOpenChat={() => openChat(lessonReader.itemId)}
          onRegenerate={() => {
            setSyncError("");
            if (lessonReader.scope === "yandex") {
              generateYandexLessonMutation.mutate(lessonReader.itemId);
            } else if (lessonReader.scope === "ozon") {
              generateOzonLessonMutation.mutate(lessonReader.itemId);
            } else {
              generateAiLessonMutation.mutate(lessonReader.itemId);
            }
          }}
          onSubmitQuiz={(answers) =>
            submitLessonQuiz(lessonReader.scope, lessonReader.itemId, answers)
          }
        />
      ) : null}
      <AiChatWidget
        key={`ai-chat-${chatDraftRequest?.id ?? 0}`}
        enabled={data.ai.enabled}
        scope={chatScope}
        topics={chatTopics}
        opened={chatOpen}
        activeItemId={activeChatItemId}
        draftRequest={chatDraftRequest}
        onOpen={() => openChat(activeChatItemId)}
        onClose={closeChat}
        onItemChange={setChatItemId}
      />
    </AppShell>
  );
}
