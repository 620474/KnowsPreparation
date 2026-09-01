import { lazy, Suspense, useEffect, useState } from "react";
import { Alert, Button, Loader } from "@mantine/core";
import { useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import { clearSession, getToken, learningApi, UNAUTHORIZED_EVENT } from "./api";
import { AiChatWidget } from "./components/AiChatWidget";
import { AppShell } from "./components/AppShell";
import { LoginScreen } from "./components/LoginScreen";
import { useAiActions } from "./hooks/use-ai-actions";
import { useAppNavigation } from "./hooks/use-app-navigation";
import { useDataActions } from "./hooks/use-data-actions";
import { buildLessonWorkspace } from "./hooks/use-lesson-workspace";
import { useMockActions } from "./hooks/use-mock-actions";
import { useProgressActions } from "./hooks/use-progress-actions";
import { BOOTSTRAP_QUERY_KEY } from "./lib/bootstrap-cache";
import { viewForTrack } from "./lib/app-route";
import { getStudyPosition } from "./lib/date";
import { useOnlineStatus } from "./lib/network";
import { synchronizeDailyReminder } from "./lib/notifications";
import { OFFLINE_MUTATION_ROOT } from "./lib/offline-mutation-keys";
import { clearPersistedQueryCache } from "./lib/query-cache";
import type { YandexMockDayId } from "./types";
const AiLessonReader = lazy(() =>
  import("./components/AiLessonReader").then((module) => ({
    default: module.AiLessonReader,
  })),
);
const AiCourseView = lazy(() =>
  import("./views/AiCourseView").then((module) => ({ default: module.AiCourseView })),
);
const AlgorithmsView = lazy(() =>
  import("./views/AlgorithmsView").then((module) => ({ default: module.AlgorithmsView })),
);
const AnalyticsView = lazy(() =>
  import("./views/AnalyticsView").then((module) => ({ default: module.AnalyticsView })),
);
const TrackDayView = lazy(() =>
  import("./views/TrackDayView").then((module) => ({
    default: module.TrackDayView,
  })),
);
const MockInterviewView = lazy(() =>
  import("./views/MockInterviewView").then((module) => ({
    default: module.MockInterviewView,
  })),
);
const InterviewSimulatorView = lazy(() =>
  import("./views/InterviewSimulatorView").then((module) => ({
    default: module.InterviewSimulatorView,
  })),
);
const OzonSprintView = lazy(() =>
  import("./views/OzonSprintView").then((module) => ({
    default: module.OzonSprintView,
  })),
);
const PlanView = lazy(() =>
  import("./views/PlanView").then((module) => ({ default: module.PlanView })),
);
const QuestionsView = lazy(() =>
  import("./views/QuestionsView").then((module) => ({ default: module.QuestionsView })),
);
const ResourcesView = lazy(() =>
  import("./views/ResourcesView").then((module) => ({ default: module.ResourcesView })),
);
const ReviewView = lazy(() =>
  import("./views/ReviewView").then((module) => ({ default: module.ReviewView })),
);
const ResearchView = lazy(() =>
  import("./views/ResearchView").then((module) => ({ default: module.ResearchView })),
);
const SettingsView = lazy(() =>
  import("./views/SettingsView").then((module) => ({ default: module.SettingsView })),
);
const TodayView = lazy(() =>
  import("./views/TodayView").then((module) => ({ default: module.TodayView })),
);
const YandexSprintView = lazy(() =>
  import("./views/YandexSprintView").then((module) => ({
    default: module.YandexSprintView,
  })),
);
const YandexPlatformMockView = lazy(() =>
  import("./views/YandexPlatformMockView").then((module) => ({
    default: module.YandexPlatformMockView,
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
  const {
    activeView,
    lessonReader,
    quizFocusItemId,
    dayReader,
    yandexMockDayId,
    researchProjectId,
    chatOpen,
    chatItemId,
    chatDraftRequest,
    setChatItemId,
    navigateToView,
    navigateToLesson,
    navigateToTrackDay,
    navigateToYandexMock,
    navigateToResearchProject,
    openLessonReader,
    closeLessonReader,
    openChat,
    openChatWithDraft,
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
    savePracticeDraft,
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
      <Suspense fallback={<div className="view-loader"><Loader color="mint" size="sm" /> Загружаю экран…</div>}>
      {activeView === "today" ? (
        <TodayView
          data={data}
          onOpenDay={(dayId) => navigateToTrackDay("curriculum", dayId)}
          onOpenAnalytics={() => navigateToView("analytics")}
          onOpenMock={() => navigateToView("interview")}
          onOpenReview={() => navigateToView("review")}
          onOpenResearch={() => navigateToResearchProject(null)}
          onOpenAdaptiveItem={(item) => {
            if (item.kind === "review") {
              navigateToView("review");
            } else if (item.kind === "mock") {
              navigateToView("interview");
            } else if (
              item.track &&
              item.itemId &&
              (item.kind === "lesson" || item.source === "lesson")
            ) {
              openLessonReader(item.track, item.itemId);
            } else if (item.track) {
              navigateToView(viewForTrack(item.track));
            }
          }}
        />
      ) : null}
      {activeView === "yandex" && yandexMockDayId ? (
        <YandexPlatformMockView
          dayId={yandexMockDayId as YandexMockDayId}
          onBack={() => navigateToTrackDay("yandex", yandexMockDayId)}
          onCompleteBlock={() =>
            updateTask(`${yandexMockDayId}-platform`, { completed: true })
          }
        />
      ) : null}
      {activeView === "yandex" && dayReader?.track === "yandex" && !yandexMockDayId ? (
        <TrackDayView
          key={dayReader.dayId}
          data={data}
          dayId={dayReader.dayId}
          days={data.yandexSprint}
          track="yandex"
          trackLabel="Яндекс"
          generatingLessonId={
            generatingLesson?.track === "yandex" ? generatingLesson.itemId : null
          }
          generationCharacters={
            generationProgress?.track === "yandex" ? generationProgress.characters : 0
          }
          onBack={() => navigateToView("yandex")}
          onGenerateLesson={(blockId) => {
            setSyncError("");
            generateLesson("yandex", blockId);
          }}
          onOpenChat={(blockId) => openChat(blockId)}
          onOpenDay={(dayId) => navigateToTrackDay("yandex", dayId)}
          onOpenLesson={(blockId) => openLessonReader("yandex", blockId)}
          onOpenPlatformMock={(mockDayId) => navigateToYandexMock(mockDayId)}
          onOpenQuiz={(blockId) => openLessonReader("yandex", blockId, true)}
          onReviewSolution={(blockId, draft) => openChatWithDraft(blockId, draft)}
          onUpdateTask={updateTask}
        />
      ) : null}
      {activeView === "yandex" && dayReader?.track !== "yandex" ? (
        <YandexSprintView
          data={data}
          onOpenDay={(dayId) => navigateToTrackDay("yandex", dayId)}
        />
      ) : null}
      {activeView === "ozon" && dayReader?.track === "ozon" ? (
        <TrackDayView
          key={dayReader.dayId}
          data={data}
          dayId={dayReader.dayId}
          days={data.ozonSprint}
          track="ozon"
          trackLabel="Ozon"
          generatingLessonId={
            generatingLesson?.track === "ozon" ? generatingLesson.itemId : null
          }
          generationCharacters={
            generationProgress?.track === "ozon" ? generationProgress.characters : 0
          }
          onBack={() => navigateToView("ozon")}
          onGenerateLesson={(blockId) => {
            setSyncError("");
            generateLesson("ozon", blockId);
          }}
          onOpenChat={(blockId) => openChat(blockId)}
          onOpenDay={(dayId) => navigateToTrackDay("ozon", dayId)}
          onOpenLesson={(blockId) => openLessonReader("ozon", blockId)}
          onOpenQuiz={(blockId) => openLessonReader("ozon", blockId, true)}
          onReviewSolution={(blockId, draft) => openChatWithDraft(blockId, draft)}
          onUpdateTask={updateTask}
        />
      ) : null}
      {activeView === "ozon" && dayReader?.track !== "ozon" ? (
        <OzonSprintView
          data={data}
          onOpenDay={(dayId) => navigateToTrackDay("ozon", dayId)}
        />
      ) : null}
      {activeView === "ai-course" ? (
        <AiCourseView
          data={data}
          generatingCourse={generatingCourse}
          generatingLessonId={
            generatingLesson?.track === "course" ? generatingLesson.itemId : null
          }
          generationCharacters={
            generationProgress?.track === "course" ? generationProgress.characters : 0
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
      {activeView === "plan" && dayReader?.track === "curriculum" ? (
        <TrackDayView
          key={dayReader.dayId}
          data={data}
          dayId={dayReader.dayId}
          days={data.curriculum.flatMap((week) => week.days)}
          track="curriculum"
          trackLabel="Учебный план"
          generatingLessonId={
            generatingLesson?.track === "curriculum" ? generatingLesson.itemId : null
          }
          generationCharacters={
            generationProgress?.track === "curriculum" ? generationProgress.characters : 0
          }
          onBack={() => navigateToView("plan")}
          onGenerateLesson={(blockId) => {
            setSyncError("");
            generateLesson("curriculum", blockId);
          }}
          onOpenChat={(blockId) => openChat(blockId)}
          onOpenDay={(dayId) => navigateToTrackDay("curriculum", dayId)}
          onOpenLesson={(blockId) => openLessonReader("curriculum", blockId)}
          onOpenQuiz={(blockId) => openLessonReader("curriculum", blockId, true)}
          onReviewSolution={(blockId, draft) => openChatWithDraft(blockId, draft)}
          onUpdateTask={updateTask}
        />
      ) : null}
      {activeView === "plan" && dayReader?.track !== "curriculum" ? (
        <PlanView
          data={data}
          onOpenDay={(dayId) => navigateToTrackDay("curriculum", dayId)}
        />
      ) : null}
      {activeView === "resources" ? <ResourcesView data={data} /> : null}
      {activeView === "questions" ? (
        <QuestionsView
          data={data}
          onOpenAnalytics={() => navigateToView("analytics")}
          onOpenMock={() => navigateToView("interview")}
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
      {activeView === "interview" ? <InterviewSimulatorView /> : null}
      {activeView === "analytics" ? (
        <AnalyticsView
          data={data}
          onBack={() => navigateToView("questions")}
          onOpenMock={() => navigateToView("interview")}
          onOpenReview={() => navigateToView("review")}
        />
      ) : null}
      {activeView === "research" ? (
        <ResearchView
          projectId={researchProjectId}
          onOpenProject={navigateToResearchProject}
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
          key={`${data.settings.startDate}:${data.settings.reminderEnabled}:${data.settings.reminderTime}:${data.settings.adaptiveTodayEnabled}`}
          data={data}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
          onOpenAlgorithms={() => navigateToView("algorithms")}
          onOpenAiCourse={() => navigateToView("ai-course")}
          onOpenOzon={() => navigateToView("ozon")}
          onOpenPlan={() => navigateToView("plan")}
          onOpenQuestions={() => navigateToView("questions")}
          onOpenResources={() => navigateToView("resources")}
          onOpenResearch={() => navigateToResearchProject(null)}
          onUpdateSettings={updateSettings}
          onLogout={logout}
        />
      ) : null}
      {lessonReader && readerLesson && readerMetadata ? (
        <AiLessonReader
          description={readerMetadata.description}
          eyebrow={readerMetadata.eyebrow}
          focusQuiz={quizFocusItemId === `${lessonReader.track}:${lessonReader.itemId}`}
          isRegenerating={
            generatingLesson?.track === lessonReader.track &&
            generatingLesson.itemId === lessonReader.itemId
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
            generateLesson(lessonReader.track, lessonReader.itemId);
          }}
          onSavePractice={savePracticeDraft}
          onSubmitQuiz={(answers) =>
            submitLessonQuiz(lessonReader.track, lessonReader.itemId, answers)
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
