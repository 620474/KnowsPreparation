import type { AiLessonQuestionContext } from "../types";

const MAX_EXCERPT_LENGTH = 2_000;

export function buildAiChatDraft({ section, excerpt }: AiLessonQuestionContext) {
  const normalizedSection = section.trim() || "Материал урока";
  const normalizedExcerpt = excerpt.trim().slice(0, MAX_EXCERPT_LENGTH);
  const quotedExcerpt = normalizedExcerpt
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return [
    `Хочу уточнить фрагмент из раздела «${normalizedSection}»:`,
    "",
    quotedExcerpt,
    "",
    "Мой вопрос: ",
  ].join("\n");
}
