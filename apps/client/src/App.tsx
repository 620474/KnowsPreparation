import { useEffect, useState } from "react";
import { Alert, Button, Loader } from "@mantine/core";
import { useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import { clearSession, getToken, learningApi, UNAUTHORIZED_EVENT } from "./api";
import { AiChatWidget } from "./components/AiChatWidget";
import { AiLessonReader } from "./components/AiLessonReader";
import { AppShell } from "./components/AppShell";
import { LoginScreen } from "./components/LoginScreen";
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
import { AiCourseView } from "./views/AiCourseView";
import { AlgorithmsView } from "./views/AlgorithmsView";
import { AnalyticsView } from "./views/AnalyticsView";
import { MockInterviewView } from "./views/MockInterviewView";
import { OzonSprintView } from "./views/OzonSprintView";
import { PlanView } from "./views/PlanView";
import { QuestionsView } from "./views/QuestionsView";
import { ResourcesView } from "./views/ResourcesView";
import { ReviewView } from "./views/ReviewView";
import { SettingsView } from "./views/SettingsView";
import { TodayView } from "./views/TodayView";
import { YandexSprintView } from "./views/YandexSprintView";

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
  const {
    activeView,
    lessonReader,
    chatOpen,
    chatItemId,
    chatDraftRequest,
    setChatItemId,
    navigateToView,
    navigateToLesson,
    openLessonReader,
    closeLessonReader,
    openChat,
    closeChat,
    resetChat,
  } = useAppNavigation();

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

  const {
    generateCourse,
    generateLesson,
    generatingCourse,
    generatingLesson,
    generationProgress,
  } = useAiActions({
    onError: setSyncError,
    navigateToView,
    navigateToLesson,
    resetChat,
  });
  const {
    updateTask,
    updateQuestion,
    reviewQuestion,
    submitLessonQuiz,
    updateSettings,
  } = useProgressActions({ online, setError: setSyncError });
  const {
    startMockInterview,
    saveMockAnswer,
    completeMockInterview,
    transcribeMockAnswer,
  } = useMockActions({ online, setError: setSyncError });
  const { addAlgorithm, deleteAlgorithm, exportBackup, importBackup } =
    useDataActions({ setError: setSyncError });

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
    readerQuizProgress,
    readerMetadata,
    chatScope,
    chatTopics,
    activeChatItemId,
  } = buildLessonWorkspace(data, activeView, lessonReader, chatItemId);
  const position = getStudyPosition(data.settings.startDate);
  const safeWeek = Math.min(Math.max(position.weekNumber, 1), data.curriculum.length);
  const weekLabel = `Неделя ${safeWeek} из ${data.curriculum.length}`;

  return (
    <AppShell
      activeView={activeView}
      onViewChange={navigateToView}
      weekLabel={weekLabel}
    >
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
            generatingLesson?.scope === "yandex" ? generatingLesson.itemId : null
          }
          generationCharacters={
            generationProgress?.scope === "yandex" ? generationProgress.characters : 0
          }
          onGenerateLesson={(blockId) => {
            setSyncError("");
            generateLesson("yandex", blockId);
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
            generatingLesson?.scope === "ozon" ? generatingLesson.itemId : null
          }
          generationCharacters={
            generationProgress?.scope === "ozon" ? generationProgress.characters : 0
          }
          onGenerateLesson={(blockId) => {
            setSyncError("");
            generateLesson("ozon", blockId);
          }}
          onOpenLesson={(blockId) => openLessonReader("ozon", blockId)}
          onOpenChat={(blockId, context) => openChat(blockId, context)}
          onUpdateTask={updateTask}
        />
      ) : null}
      {activeView === "ai-course" ? (
        <AiCourseView
          data={data}
          generatingCourse={generatingCourse}
          generatingLessonId={
            generatingLesson?.scope === "course" ? generatingLesson.itemId : null
          }
          generationCharacters={
            generationProgress?.scope === "course" ? generationProgress.characters : 0
          }
          onGenerateCourse={(profile) => {
            setSyncError("");
            generateCourse(profile);
          }}
          onGenerateLesson={(itemId) => {
            setSyncError("");
            generateLesson("course", itemId);
          }}
          onOpenLesson={(itemId) => openLessonReader("course", itemId)}
          onOpenChat={(itemId, context) => openChat(itemId, context)}
        />
      ) : null}
      {activeView === "plan" ? (
        <PlanView data={data} onUpdateTask={updateTask} />
      ) : null}
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
          onTranscribe={transcribeMockAnswer}
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
          onDelete={deleteAlgorithm}
          onUpdateTask={updateTask}
        />
      ) : null}
      {activeView === "settings" ? (
        <SettingsView
          key={`${data.settings.startDate}:${data.settings.reminderEnabled}:${data.settings.reminderTime}`}
          data={data}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
          onOpenOzon={() => navigateToView("ozon")}
          onUpdateSettings={updateSettings}
          onLogout={logout}
        />
      ) : null}
      {lessonReader && readerLesson && readerMetadata ? (
        <AiLessonReader
          description={readerMetadata.description}
          eyebrow={readerMetadata.eyebrow}
          isRegenerating={
            generatingLesson?.scope === lessonReader.scope &&
            generatingLesson.itemId === lessonReader.itemId
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
            generateLesson(lessonReader.scope, lessonReader.itemId);
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
