import type { AppView, LessonRouteTarget } from "../lib/app-route";
import type { BootstrapData } from "../types";

export function buildLessonWorkspace(
  data: BootstrapData,
  activeView: AppView,
  lessonReader: LessonRouteTarget | null,
  chatItemId: string | null,
) {
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
  const readerPracticeProgress = lessonReader
    ? data.ai.practiceProgress[lessonReader.scope]?.[lessonReader.itemId]
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
    (activeView === "yandex"
      ? "yandex"
      : activeView === "ozon"
        ? "ozon"
        : "course");
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
    chatScope,
    chatTopics,
    activeChatItemId,
  };
}
