import type { AppView, LessonRouteTarget } from "../lib/app-route";
import { trackForView } from "../lib/app-route";
import type { BootstrapData, StudyDay, TrackKey } from "../types";

interface ChatTopic {
  id: string;
  title: string;
  objective: string;
}

interface TrackItem {
  topic: ChatTopic;
  eyebrow: string;
  description: string;
  resourceIds: string[];
}

/** Темы дней превращаются в плоский список блоков, доступных для разбора. */
function collectDayItems(days: StudyDay[], eyebrowPrefix: string): TrackItem[] {
  return days.flatMap((day) =>
    day.blocks
      .filter((block) => block.kind !== "review")
      .map((block) => ({
        topic: {
          id: block.id,
          title: block.title,
          objective: `${day.title}. ${block.description}`,
        },
        eyebrow: `${eyebrowPrefix} · день ${day.dayNumber}`,
        description: block.description,
        resourceIds: block.resourceIds,
      })),
  );
}

function collectTrackItems(data: BootstrapData): Record<TrackKey, TrackItem[]> {
  return {
    course:
      data.ai.course?.items.map((item) => ({
        topic: { id: item.id, title: item.title, objective: item.objective },
        eyebrow: "Персональный AI-курс",
        description: item.objective,
        resourceIds: item.resourceIds,
      })) ?? [],
    curriculum: collectDayItems(
      data.curriculum.flatMap((week) => week.days),
      "Учебный план",
    ),
    yandex: collectDayItems(data.yandexSprint, "Яндекс"),
    ozon: collectDayItems(data.ozonSprint, "Ozon"),
  };
}

export function buildLessonWorkspace(
  data: BootstrapData,
  activeView: AppView,
  lessonReader: LessonRouteTarget | null,
  chatItemId: string | null,
) {
  const trackItems = collectTrackItems(data);
  const readerItem = lessonReader
    ? trackItems[lessonReader.track].find(
        (item) => item.topic.id === lessonReader.itemId,
      )
    : undefined;

  const readerLesson = lessonReader
    ? data.ai.lessons[lessonReader.track]?.[lessonReader.itemId]
    : undefined;
  const readerQuizProgress = lessonReader
    ? data.ai.quizProgress[lessonReader.track]?.[lessonReader.itemId]
    : undefined;
  const readerPracticeProgress = lessonReader
    ? data.ai.practiceProgress[lessonReader.track]?.[lessonReader.itemId]
    : undefined;
  const readerMetadata = readerItem
    ? {
        eyebrow: readerItem.eyebrow,
        title: readerItem.topic.title,
        description: readerItem.description,
        resourceIds: readerItem.resourceIds,
      }
    : undefined;

  // Читалка урока задаёт трек напрямую, иначе его определяет открытый экран.
  const chatTrack = lessonReader?.track ?? trackForView(activeView) ?? "course";
  const chatTopics =
    lessonReader || trackForView(activeView)
      ? trackItems[chatTrack].map((item) => item.topic)
      : [];
  const generatedChatLessons = data.ai.lessons[chatTrack] ?? {};
  const fallbackChatItemId =
    chatTopics.find((item) => generatedChatLessons[item.id])?.id ??
    chatTopics[0]?.id ??
    null;
  const activeChatItemId =
    chatItemId && chatTopics.some((item) => item.id === chatItemId)
      ? chatItemId
      : fallbackChatItemId;

  return {
    readerLesson,
    readerQuizProgress,
    readerPracticeProgress,
    readerMetadata,
    chatTrack,
    chatTopics,
    activeChatItemId,
  };
}
