import { useEffect, useRef, useState } from "react";
import { Alert, Button, Loader } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";

import {
  clearSession,
  getToken,
  learningApi,
  UNAUTHORIZED_EVENT,
} from "./api";
import { AppShell, type AppView } from "./components/AppShell";
import { AiChatWidget } from "./components/AiChatWidget";
import { AiLessonReader } from "./components/AiLessonReader";
import { LoginScreen } from "./components/LoginScreen";
import { buildAiChatDraft } from "./lib/ai-chat-draft";
import { getStudyPosition } from "./lib/date";
import type {
  AlgorithmEntry,
  AiChatScope,
  AiCourse,
  AiCourseProfile,
  AiLesson,
  AiLessonQuestionContext,
  BootstrapData,
  QuestionProgress,
  TaskProgress,
  TaskProgressPatch,
} from "./types";
import { AlgorithmsView } from "./views/AlgorithmsView";
import { AiCourseView } from "./views/AiCourseView";
import { PlanView } from "./views/PlanView";
import { QuestionsView } from "./views/QuestionsView";
import { ResourcesView } from "./views/ResourcesView";
import { SettingsView } from "./views/SettingsView";
import { TodayView } from "./views/TodayView";
import { YandexSprintView } from "./views/YandexSprintView";

const BOOTSTRAP_KEY = ["bootstrap"] as const;
type MutationContext = { previous?: BootstrapData };
type TaskMutationVariables = { taskId: string; progress: TaskProgressPatch };
type QuestionMutationVariables = { questionId: string; progress: QuestionProgress };
type LessonReaderTarget = { scope: AiChatScope; itemId: string };

export default function App() {
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [activeView, setActiveView] = useState<AppView>("yandex");
  const [syncError, setSyncError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatItemId, setChatItemId] = useState<string | null>(null);
  const [lessonReader, setLessonReader] = useState<LessonReaderTarget | null>(null);
  const [chatDraftRequest, setChatDraftRequest] = useState<{
    id: number;
    content: string;
  } | null>(null);
  const chatRequestIdRef = useRef(0);
  const readingScrollRef = useRef(0);

  useEffect(() => {
    const handleUnauthorized = () => setAuthenticated(false);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!lessonReader) return;
    const marker = `${lessonReader.scope}:${lessonReader.itemId}`;
    if (window.history.state?.lessonReader !== marker) {
      window.history.pushState({ ...window.history.state, lessonReader: marker }, "");
    }
    const handlePopState = () => setLessonReader(null);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [lessonReader]);

  const bootstrapQuery = useQuery({
    queryKey: BOOTSTRAP_KEY,
    queryFn: learningApi.bootstrap,
    enabled: authenticated,
    refetchInterval: 60_000,
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
      setLessonReader(null);
    },
    onError: (error) => setSyncError(error.message),
  });

  const generateAiLessonMutation = useMutation<AiLesson, Error, string>({
    mutationFn: learningApi.generateAiLesson,
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
      setChatItemId(lesson.itemId);
      setLessonReader({ scope: "course", itemId: lesson.itemId });
    },
    onError: (error) => setSyncError(error.message),
  });

  const generateYandexLessonMutation = useMutation<AiLesson, Error, string>({
    mutationFn: learningApi.generateYandexLesson,
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
      setChatItemId(lesson.itemId);
      setLessonReader({ scope: "yandex", itemId: lesson.itemId });
    },
    onError: (error) => setSyncError(error.message),
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

  const settingsMutation = useMutation<{ startDate: string }, Error, string>({
    mutationFn: learningApi.updateSettings,
    onSuccess: ({ startDate }) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_KEY, (current: BootstrapData | undefined) =>
        current ? { ...current, settings: { ...current.settings, startDate } } : current,
      );
      setActiveView("today");
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

  if (bootstrapQuery.isPending) {
    return (
      <main className="state-page">
        <Loader color="mint" size="lg" />
        <h1>Собираю твой план</h1>
        <p>Загружаю прогресс из общей базы…</p>
      </main>
    );
  }

  if (bootstrapQuery.isError || !bootstrapQuery.data) {
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
  const readerLesson = lessonReader
    ? lessonReader.scope === "yandex"
      ? data.ai.yandexLessons[lessonReader.itemId]
      : data.ai.lessons[lessonReader.itemId]
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
      : undefined;
  const chatScope = lessonReader?.scope ?? (activeView === "yandex" ? "yandex" : "course");
  const chatTopics = lessonReader
    ? lessonReader.scope === "yandex"
      ? yandexChatTopics
      : courseChatTopics
    : activeView === "yandex"
      ? yandexChatTopics
      : activeView === "ai-course"
        ? courseChatTopics
        : [];
  const generatedChatLessons =
    chatScope === "yandex" ? data.ai.yandexLessons : data.ai.lessons;
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
  const addAlgorithm = (entry: Omit<AlgorithmEntry, "id">) => {
    setSyncError("");
    addAlgorithmMutation.mutate(entry);
  };
  const openLessonReader = (scope: AiChatScope, itemId: string) => {
    setChatItemId(itemId);
    setLessonReader({ scope, itemId });
  };
  const closeLessonReader = () => {
    if (window.history.state?.lessonReader) {
      window.history.back();
      return;
    }
    setLessonReader(null);
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
      onViewChange={(view) => {
        setActiveView(view);
        setChatOpen(false);
        setChatItemId(null);
        setChatDraftRequest(null);
        setLessonReader(null);
      }}
      weekLabel={weekLabel}
    >
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
      {activeView === "today" ? <TodayView data={data} onUpdateTask={updateTask} /> : null}
      {activeView === "yandex" ? (
        <YandexSprintView
          data={data}
          generatingLessonId={
            generateYandexLessonMutation.isPending
              ? (generateYandexLessonMutation.variables ?? null)
              : null
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
      {activeView === "ai-course" ? (
        <AiCourseView
          data={data}
          generatingCourse={generateAiCourseMutation.isPending}
          generatingLessonId={
            generateAiLessonMutation.isPending
              ? (generateAiLessonMutation.variables ?? null)
              : null
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
        <QuestionsView data={data} onUpdateQuestion={updateQuestion} />
      ) : null}
      {activeView === "algorithms" ? (
        <AlgorithmsView
          data={data}
          onAdd={addAlgorithm}
          onDelete={(id) => deleteAlgorithmMutation.mutate(id)}
        />
      ) : null}
      {activeView === "settings" ? (
        <SettingsView
          data={data}
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
              : generateAiLessonMutation.isPending
          }
          lesson={readerLesson}
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
            } else {
              generateAiLessonMutation.mutate(lessonReader.itemId);
            }
          }}
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
