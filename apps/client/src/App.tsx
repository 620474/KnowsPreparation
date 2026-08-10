import { useEffect, useState } from "react";
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
import { LoginScreen } from "./components/LoginScreen";
import { getStudyPosition } from "./lib/date";
import type {
  AlgorithmEntry,
  BootstrapData,
  QuestionProgress,
  TaskProgress,
  TaskProgressPatch,
} from "./types";
import { AlgorithmsView } from "./views/AlgorithmsView";
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

export default function App() {
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [activeView, setActiveView] = useState<AppView>("yandex");
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    const handleUnauthorized = () => setAuthenticated(false);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

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

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView} weekLabel={weekLabel}>
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
        <YandexSprintView data={data} onUpdateTask={updateTask} />
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
    </AppShell>
  );
}
