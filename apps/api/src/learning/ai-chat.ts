import type { LearningResource } from "./resources";
import type { AiCourse, AiCourseItem, AiLesson } from "./schemas/ai-course.schema";
import type { StudyBlock, StudyDay } from "./curriculum";

interface AiChatContextInput {
  course: AiCourse;
  item: AiCourseItem;
  lesson: AiLesson | null;
  resources: LearningResource[];
}

interface YandexAiChatContextInput {
  day: StudyDay;
  block: StudyBlock;
  lesson: AiLesson | null;
  resources: LearningResource[];
}

function buildLessonSections(lesson: AiLesson | null) {
  if (!lesson) return ["Полный текст урока ещё не сгенерирован."];

  const diagrams = lesson.diagrams ?? [];

  return [
    `Цели урока:\n${lesson.goals.map((goal) => `- ${goal}`).join("\n")}`,
    `Объяснение урока:\n${lesson.explanation}`,
    `Примеры кода:\n${lesson.codeExamples
      .map(
        (example) =>
          `${example.title}\n${example.code}\nПояснение: ${example.explanation}`,
      )
      .join("\n\n")}`,
    diagrams.length > 0
      ? `Диаграммы урока:\n${diagrams
          .map(
            (diagram) =>
              `${diagram.title}: ${diagram.description}\nУзлы:\n${diagram.nodes
                .map((node) => `- ${node.label}: ${node.detail}`)
                .join("\n")}\nСвязи:\n${diagram.edges
                .map((edge) => `- ${edge.from} → ${edge.to}: ${edge.label}`)
                .join("\n")}`,
          )
          .join("\n\n")}`
      : "Диаграммы урока: отсутствуют.",
    `Частые ошибки:\n${lesson.commonMistakes.map((item) => `- ${item}`).join("\n")}`,
    `Вопросы на собеседовании:\n${lesson.interviewQuestions
      .map((item) => `- ${item}`)
      .join("\n")}`,
    `Практическая задача: ${lesson.practice.title}\n${lesson.practice.statement}`,
    `Итог урока: ${lesson.summary}`,
  ];
}

function buildResourceSection(resources: LearningResource[]) {
  if (resources.length === 0) return null;
  return `Дополнительные источники:\n${resources
    .map((resource) => `- ${resource.title} (${resource.provider}): ${resource.description}`)
    .join("\n")}`;
}

export function buildAiChatContext({
  course,
  item,
  lesson,
  resources,
}: AiChatContextInput) {
  const sections = [
    `Цель подготовки: ${course.goal}`,
    `Уровень: ${course.level}`,
    `Целевые компании: ${course.targetCompanies.join(", ") || "не указаны"}`,
    `Текущая тема: ${item.title}`,
    `Цель темы: ${item.objective}`,
    `Плановое время: ${item.estimatedMinutes} минут`,
  ];

  sections.push(...buildLessonSections(lesson));
  const resourceSection = buildResourceSection(resources);
  if (resourceSection) sections.push(resourceSection);

  return sections.join("\n\n").slice(0, 30_000);
}

export function buildYandexAiChatContext({
  day,
  block,
  lesson,
  resources,
}: YandexAiChatContextInput) {
  const sections = [
    "Цель подготовки: пройти frontend-собеседование в Яндекс",
    "Уровень: Middle+/Senior",
    `День спринта: ${day.dayNumber}. ${day.title}`,
    `Текущий блок: ${block.title}`,
    `Тип блока: ${block.kind}`,
    `Описание: ${block.description}`,
    `Плановое время: ${block.minutes} минут`,
  ];

  if (block.exercise) {
    sections.push(
      `Исходная задача:\n${block.exercise.statement}`,
      `Сигнатура: ${block.exercise.signature ?? "не задана"}`,
      `Ограничения:\n${block.exercise.constraints.map((item) => `- ${item}`).join("\n")}`,
    );
  }

  sections.push(...buildLessonSections(lesson));
  const resourceSection = buildResourceSection(resources);
  if (resourceSection) sections.push(resourceSection);

  return sections.join("\n\n").slice(0, 30_000);
}
