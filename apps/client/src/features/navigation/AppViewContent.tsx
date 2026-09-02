import { lazy } from "react";

import type { useAiActions } from "../../hooks/use-ai-actions";
import type { useAppNavigation } from "../../hooks/use-app-navigation";
import type { useDataActions } from "../../hooks/use-data-actions";
import type { useMockActions } from "../../hooks/use-mock-actions";
import type { useProgressActions } from "../../hooks/use-progress-actions";
import { viewForTrack } from "../../lib/app-route";
import type { BootstrapData, YandexMockDayId } from "../../types";

const PreparationHub = lazy(() =>
  import("../preparation/PreparationHub").then((module) => ({
    default: module.PreparationHub,
  })),
);
const KnowledgeHub = lazy(() =>
  import("../knowledge/KnowledgeHub").then((module) => ({
    default: module.KnowledgeHub,
  })),
);
const ResearchView = lazy(() =>
  import("../research").then((module) => ({ default: module.ResearchView })),
);
const CareerView = lazy(() =>
  import("../career/CareerView").then((module) => ({ default: module.CareerView })),
);
const AiCourseView = lazy(() =>
  import("../../views/AiCourseView").then((module) => ({ default: module.AiCourseView })),
);
const AlgorithmsView = lazy(() =>
  import("../../views/AlgorithmsView").then((module) => ({ default: module.AlgorithmsView })),
);
const AnalyticsView = lazy(() =>
  import("../../views/AnalyticsView").then((module) => ({ default: module.AnalyticsView })),
);
const TrackDayView = lazy(() =>
  import("../../views/TrackDayView").then((module) => ({ default: module.TrackDayView })),
);
const MockInterviewView = lazy(() =>
  import("../../views/MockInterviewView").then((module) => ({ default: module.MockInterviewView })),
);
const InterviewSimulatorView = lazy(() =>
  import("../../views/InterviewSimulatorView").then((module) => ({ default: module.InterviewSimulatorView })),
);
const OzonSprintView = lazy(() =>
  import("../../views/OzonSprintView").then((module) => ({ default: module.OzonSprintView })),
);
const PlanView = lazy(() =>
  import("../../views/PlanView").then((module) => ({ default: module.PlanView })),
);
const QuestionsView = lazy(() =>
  import("../../views/QuestionsView").then((module) => ({ default: module.QuestionsView })),
);
const ResourcesView = lazy(() =>
  import("../../views/ResourcesView").then((module) => ({ default: module.ResourcesView })),
);
const ReviewView = lazy(() =>
  import("../../views/ReviewView").then((module) => ({ default: module.ReviewView })),
);
const SettingsView = lazy(() =>
  import("../../views/SettingsView").then((module) => ({ default: module.SettingsView })),
);
const TodayView = lazy(() =>
  import("../../views/TodayView").then((module) => ({ default: module.TodayView })),
);
const YandexSprintView = lazy(() =>
  import("../../views/YandexSprintView").then((module) => ({ default: module.YandexSprintView })),
);
const YandexPlatformMockView = lazy(() =>
  import("../../views/YandexPlatformMockView").then((module) => ({ default: module.YandexPlatformMockView })),
);

interface AppViewContentProps {
  aiActions: ReturnType<typeof useAiActions>;
  data: BootstrapData;
  dataActions: ReturnType<typeof useDataActions>;
  mockActions: ReturnType<typeof useMockActions>;
  navigation: ReturnType<typeof useAppNavigation>;
  onLogout: () => void;
  progressActions: ReturnType<typeof useProgressActions>;
  setError: (message: string) => void;
}

export function AppViewContent({
  aiActions,
  data,
  dataActions,
  mockActions,
  navigation,
  onLogout,
  progressActions,
  setError,
}: AppViewContentProps) {
  const {
    activeView,
    dayReader,
    yandexMockDayId,
    researchProjectId,
    navigateToView,
    navigateToTrackDay,
    navigateToYandexMock,
    navigateToResearchProject,
    openLessonReader,
    openChat,
    openChatWithDraft,
  } = navigation;
  const {
    generateCourse,
    generateLesson,
    generatingCourse,
    generatingLesson,
    generationProgress,
  } = aiActions;
  const { updateTask, updateQuestion, submitQuestionAttempt, updateSettings } = progressActions;
  const {
    startMockInterview,
    saveMockAnswer,
    completeMockInterview,
    transcribeMockAnswer,
  } = mockActions;
  const { addAlgorithm, deleteAlgorithm, exportBackup, importBackup } = dataActions;

  if (activeView === "today") {
    return (
      <TodayView
        data={data}
        onOpenDay={(dayId) => navigateToTrackDay("curriculum", dayId)}
        onOpenAnalytics={() => navigateToView("analytics")}
        onOpenCareer={() => navigateToView("career")}
        onOpenMock={() => navigateToView("interview")}
        onOpenReview={() => navigateToView("review")}
        onOpenResearch={() => navigateToResearchProject(null)}
        onOpenAdaptiveItem={(item) => {
          if (item.kind === "review") navigateToView("review");
          else if (item.kind === "mock") navigateToView("interview");
          else if (item.kind === "career") navigateToView("career");
          else if (
            item.track &&
            item.itemId &&
            (item.kind === "lesson" || item.source === "lesson")
          ) openLessonReader(item.track, item.itemId);
          else if (item.track) navigateToView(viewForTrack(item.track));
        }}
      />
    );
  }

  if (activeView === "preparation") {
    return (
      <PreparationHub
        data={data}
        onOpenCareer={() => navigateToView("career")}
        onOpenInterview={() => navigateToView("interview")}
        onOpenOzon={() => navigateToView("ozon")}
        onOpenPlan={() => navigateToView("plan")}
        onOpenYandex={() => navigateToView("yandex")}
      />
    );
  }

  if (activeView === "knowledge") {
    return (
      <KnowledgeHub
        data={data}
        onOpenAiCourse={() => navigateToView("ai-course")}
        onOpenAlgorithms={() => navigateToView("algorithms")}
        onOpenAnalytics={() => navigateToView("analytics")}
        onOpenQuestions={() => navigateToView("questions")}
        onOpenResources={() => navigateToView("resources")}
        onOpenReview={() => navigateToView("review")}
      />
    );
  }

  if (activeView === "career") {
    return <CareerView onOpenInterview={() => navigateToView("interview")} />;
  }

  if (activeView === "yandex" && yandexMockDayId) {
    return (
      <YandexPlatformMockView
        dayId={yandexMockDayId as YandexMockDayId}
        onBack={() => navigateToTrackDay("yandex", yandexMockDayId)}
        onCompleteBlock={() => updateTask(`${yandexMockDayId}-platform`, { completed: true })}
      />
    );
  }

  if (activeView === "yandex" && dayReader?.track === "yandex") {
    return (
      <TrackDayView
        key={dayReader.dayId}
        data={data}
        dayId={dayReader.dayId}
        days={data.yandexSprint}
        track="yandex"
        trackLabel="Яндекс"
        generatingLessonId={generatingLesson?.track === "yandex" ? generatingLesson.itemId : null}
        generationCharacters={generationProgress?.track === "yandex" ? generationProgress.characters : 0}
        onBack={() => navigateToView("yandex")}
        onGenerateLesson={(blockId) => { setError(""); generateLesson("yandex", blockId); }}
        onOpenChat={(blockId) => openChat(blockId)}
        onOpenDay={(dayId) => navigateToTrackDay("yandex", dayId)}
        onOpenLesson={(blockId) => openLessonReader("yandex", blockId)}
        onOpenPlatformMock={(mockDayId) => navigateToYandexMock(mockDayId)}
        onOpenQuiz={(blockId) => openLessonReader("yandex", blockId, true)}
        onReviewSolution={(blockId, draft) => openChatWithDraft(blockId, draft)}
        onUpdateTask={updateTask}
      />
    );
  }

  if (activeView === "yandex") {
    return <YandexSprintView data={data} onOpenDay={(dayId) => navigateToTrackDay("yandex", dayId)} />;
  }

  if (activeView === "ozon" && dayReader?.track === "ozon") {
    return (
      <TrackDayView
        key={dayReader.dayId}
        data={data}
        dayId={dayReader.dayId}
        days={data.ozonSprint}
        track="ozon"
        trackLabel="Ozon"
        generatingLessonId={generatingLesson?.track === "ozon" ? generatingLesson.itemId : null}
        generationCharacters={generationProgress?.track === "ozon" ? generationProgress.characters : 0}
        onBack={() => navigateToView("ozon")}
        onGenerateLesson={(blockId) => { setError(""); generateLesson("ozon", blockId); }}
        onOpenChat={(blockId) => openChat(blockId)}
        onOpenDay={(dayId) => navigateToTrackDay("ozon", dayId)}
        onOpenLesson={(blockId) => openLessonReader("ozon", blockId)}
        onOpenQuiz={(blockId) => openLessonReader("ozon", blockId, true)}
        onReviewSolution={(blockId, draft) => openChatWithDraft(blockId, draft)}
        onUpdateTask={updateTask}
      />
    );
  }

  if (activeView === "ozon") {
    return <OzonSprintView data={data} onOpenDay={(dayId) => navigateToTrackDay("ozon", dayId)} />;
  }

  if (activeView === "ai-course") {
    return (
      <AiCourseView
        data={data}
        generatingCourse={generatingCourse}
        generatingLessonId={generatingLesson?.track === "course" ? generatingLesson.itemId : null}
        generationCharacters={generationProgress?.track === "course" ? generationProgress.characters : 0}
        onGenerateCourse={(profile) => { setError(""); generateCourse(profile); }}
        onGenerateLesson={(itemId) => { setError(""); generateLesson("course", itemId); }}
        onOpenLesson={(itemId) => openLessonReader("course", itemId)}
        onOpenChat={(itemId, context) => openChat(itemId, context)}
      />
    );
  }

  if (activeView === "plan" && dayReader?.track === "curriculum") {
    return (
      <TrackDayView
        key={dayReader.dayId}
        data={data}
        dayId={dayReader.dayId}
        days={data.curriculum.flatMap((week) => week.days)}
        track="curriculum"
        trackLabel="Учебный план"
        generatingLessonId={generatingLesson?.track === "curriculum" ? generatingLesson.itemId : null}
        generationCharacters={generationProgress?.track === "curriculum" ? generationProgress.characters : 0}
        onBack={() => navigateToView("plan")}
        onGenerateLesson={(blockId) => { setError(""); generateLesson("curriculum", blockId); }}
        onOpenChat={(blockId) => openChat(blockId)}
        onOpenDay={(dayId) => navigateToTrackDay("curriculum", dayId)}
        onOpenLesson={(blockId) => openLessonReader("curriculum", blockId)}
        onOpenQuiz={(blockId) => openLessonReader("curriculum", blockId, true)}
        onReviewSolution={(blockId, draft) => openChatWithDraft(blockId, draft)}
        onUpdateTask={updateTask}
      />
    );
  }

  if (activeView === "plan") {
    return <PlanView data={data} onOpenDay={(dayId) => navigateToTrackDay("curriculum", dayId)} />;
  }

  if (activeView === "resources") return <ResourcesView data={data} />;
  if (activeView === "questions") {
    return (
      <QuestionsView
        data={data}
        onOpenAnalytics={() => navigateToView("analytics")}
        onOpenMock={() => navigateToView("interview")}
        onOpenReview={() => navigateToView("review")}
        onUpdateQuestion={updateQuestion}
      />
    );
  }
  if (activeView === "review") {
    return <ReviewView data={data} onBack={() => navigateToView("knowledge")} onSubmitAttempt={submitQuestionAttempt} />;
  }
  if (activeView === "mock-interview") {
    return (
      <MockInterviewView
        data={data}
        onBack={() => navigateToView("knowledge")}
        onComplete={completeMockInterview}
        onSaveAnswer={saveMockAnswer}
        onStart={startMockInterview}
        onTranscribe={transcribeMockAnswer}
      />
    );
  }
  if (activeView === "interview") return <InterviewSimulatorView />;
  if (activeView === "analytics") {
    return (
      <AnalyticsView
        data={data}
        onBack={() => navigateToView("knowledge")}
        onOpenMock={() => navigateToView("interview")}
        onOpenReview={() => navigateToView("review")}
      />
    );
  }
  if (activeView === "research") {
    return <ResearchView projectId={researchProjectId} onOpenProject={navigateToResearchProject} />;
  }
  if (activeView === "algorithms") {
    return <AlgorithmsView data={data} onAdd={addAlgorithm} onDelete={deleteAlgorithm} onUpdateTask={updateTask} />;
  }
  if (activeView === "settings") {
    return (
      <SettingsView
        key={`${data.settings.startDate}:${data.settings.reminderEnabled}:${data.settings.reminderTime}:${data.settings.adaptiveTodayEnabled}`}
        data={data}
        onExportBackup={exportBackup}
        onImportBackup={importBackup}
        onUpdateSettings={updateSettings}
        onLogout={onLogout}
      />
    );
  }

  return null;
}
