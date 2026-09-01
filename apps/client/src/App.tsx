import { lazy, Suspense, useEffect, useState } from "react";
import { Alert, Button, Loader } from "@mantine/core";
import { useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import { clearSession, getToken, learningApi, UNAUTHORIZED_EVENT } from "./api";
import { AiChatWidget } from "./components/AiChatWidget";
import { AppShell } from "./components/AppShell";
import { LoginScreen } from "./components/LoginScreen";
import { AppViewContent } from "./features/navigation/AppViewContent";
import { useAiActions } from "./hooks/use-ai-actions";
import { useAppNavigation } from "./hooks/use-app-navigation";
import { useDataActions } from "./hooks/use-data-actions";
import { buildLessonWorkspace } from "./hooks/use-lesson-workspace";
import { useMockActions } from "./hooks/use-mock-actions";
import { useProgressActions } from "./hooks/use-progress-actions";
import { BOOTSTRAP_QUERY_KEY } from "./lib/bootstrap-cache";
import { getStudyPosition } from "./lib/date";
import { useOnlineStatus } from "./lib/network";
import { synchronizeDailyReminder } from "./lib/notifications";
import { OFFLINE_MUTATION_ROOT } from "./lib/offline-mutation-keys";
import { clearPersistedQueryCache } from "./lib/query-cache";

const AiLessonReader = lazy(() =>
  import("./components/AiLessonReader").then((module) => ({
    default: module.AiLessonReader,
  })),
);

export default function App() {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const queuedOfflineMutationCount = useMutationState({
    filters: {
      mutationKey: OFFLINE_MUTATION_ROOT,
      status: "pending",
      predicate: (mutation) => mutation.state.isPaused,
    },
  }).length;
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [syncError, setSyncError] = useState("");
  const navigation = useAppNavigation();
  const {
    activeView,
    lessonReader,
    quizFocusItemId,
    chatOpen,
    chatItemId,
    chatDraftRequest,
    setChatItemId,
    navigateToView,
    navigateToLesson,
    closeLessonReader,
    openChat,
    closeChat,
    resetChat,
  } = navigation;

  useEffect(() => {
    const handleUnauthorized = () => setAuthenticated(false);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const bootstrapQuery = useQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: learningApi.bootstrap,
    enabled: authenticated,
    refetchInterval: online ? 60_000 : false,
    refetchOnWindowFocus: true,
  });
  const reminderEnabled = bootstrapQuery.data?.settings.reminderEnabled;
  const reminderTime = bootstrapQuery.data?.settings.reminderTime;

  useEffect(() => {
    if (reminderEnabled === undefined || reminderTime === undefined) return;
    void synchronizeDailyReminder({ reminderEnabled, reminderTime }, false).catch(
      () => undefined,
    );
  }, [reminderEnabled, reminderTime]);

  const aiActions = useAiActions({
    onError: setSyncError,
    navigateToView,
    navigateToLesson,
    resetChat,
  });
  const progressActions = useProgressActions({ online, setError: setSyncError });
  const mockActions = useMockActions({ online, setError: setSyncError });
  const dataActions = useDataActions({ setError: setSyncError });

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
          void queryClient.resumePausedMutations();
          void queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
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
        <p>
          {bootstrapQuery.error?.message ??
            "Проверь адрес API и подключение к интернету."}
        </p>
        <div className="state-actions">
          <Button
            className="primary-button"
            type="button"
            leftSection={<RefreshCw size={18} />}
            onClick={() => void bootstrapQuery.refetch()}
          >
            Повторить
          </Button>
          <Button
            className="secondary-button"
            type="button"
            variant="default"
            onClick={logout}
          >
            Сменить подключение
          </Button>
        </div>
      </main>
    );
  }

  const data = bootstrapQuery.data;
  const {
    readerLesson,
    readerPracticeProgress,
    readerQuizProgress,
    readerMetadata,
    chatTrack,
    chatTopics,
    activeChatItemId,
  } = buildLessonWorkspace(data, activeView, lessonReader, chatItemId);
  const position = getStudyPosition(data.settings.startDate);
  const safeWeek = Math.min(Math.max(position.weekNumber, 1), data.curriculum.length);
  const weekLabel = `Неделя ${safeWeek} из ${data.curriculum.length}`;

  return (
    <AppShell activeView={activeView} onViewChange={navigateToView} weekLabel={weekLabel}>
      {!online || bootstrapQuery.isError || queuedOfflineMutationCount > 0 ? (
        <Alert
          className="offline-alert"
          color="yellow"
          icon={<WifiOff size={17} />}
          variant="light"
        >
          {!online
            ? `Офлайн-режим: изменения сохраняются на устройстве${queuedOfflineMutationCount > 0 ? ` · в очереди ${queuedOfflineMutationCount}` : ""}. AI требует интернет.`
            : queuedOfflineMutationCount > 0
              ? `Синхронизирую изменения: ${queuedOfflineMutationCount}`
              : "Показываю сохранённые данные, пока API недоступен."}
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
      <Suspense
        fallback={<div className="view-loader"><Loader color="mint" size="sm" /> Загружаю экран…</div>}
      >
        <AppViewContent
          aiActions={aiActions}
          data={data}
          dataActions={dataActions}
          mockActions={mockActions}
          navigation={navigation}
          onLogout={logout}
          progressActions={progressActions}
          setError={setSyncError}
        />
        {lessonReader && readerLesson && readerMetadata ? (
          <AiLessonReader
            description={readerMetadata.description}
            eyebrow={readerMetadata.eyebrow}
            focusQuiz={quizFocusItemId === `${lessonReader.track}:${lessonReader.itemId}`}
            isRegenerating={
              aiActions.generatingLesson?.track === lessonReader.track &&
              aiActions.generatingLesson.itemId === lessonReader.itemId
            }
            lesson={readerLesson}
            practiceProgress={readerPracticeProgress}
            quizProgress={readerQuizProgress}
            resourceIds={readerMetadata.resourceIds}
            resources={data.resources}
            title={readerMetadata.title}
            track={lessonReader.track}
            onAsk={(context) => openChat(lessonReader.itemId, context)}
            onBack={closeLessonReader}
            onOpenChat={() => openChat(lessonReader.itemId)}
            error={syncError}
            onDismissError={() => setSyncError("")}
            onRegenerate={() => {
              setSyncError("");
              aiActions.generateLesson(lessonReader.track, lessonReader.itemId);
            }}
            onSavePractice={progressActions.savePracticeDraft}
            onSubmitQuiz={(answers) =>
              progressActions.submitLessonQuiz(
                lessonReader.track,
                lessonReader.itemId,
                answers,
              )
            }
          />
        ) : null}
      </Suspense>
      <AiChatWidget
        key={`ai-chat-${chatDraftRequest?.id ?? 0}`}
        enabled={data.ai.enabled}
        track={chatTrack}
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
