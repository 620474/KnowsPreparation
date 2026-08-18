import type { AiLessonQuestionContext } from "../types";

const MAX_EXCERPT_LENGTH = 2_000;
const MAX_REVIEW_TASK_LENGTH = 4_000;
const MAX_REVIEW_SOLUTION_LENGTH = 7_000;

interface SolutionReviewDraftInput {
  title: string;
  task: string;
  solution: string;
}

function truncateForReview(value: string, maxLength: number) {
  const normalized = value.trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength)}\n\n[Фрагмент обрезан: полный текст можно прислать следующим сообщением.]`;
}

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

export function buildSolutionReviewDraft({
  title,
  task,
  solution,
}: SolutionReviewDraftInput) {
  const normalizedTask = truncateForReview(task, MAX_REVIEW_TASK_LENGTH) || "Условие не записано.";
  const normalizedSolution = truncateForReview(solution, MAX_REVIEW_SOLUTION_LENGTH);

  return [
    `Я самостоятельно решил задачу «${title}». Проведи review как на frontend-интервью.`,
    "Не пиши полное альтернативное решение сразу. Сначала укажи, верна ли идея, затем найди ошибки и крайние случаи, проверь Big-O и задай один уточняющий вопрос, если данных недостаточно.",
    "",
    "Условие:",
    normalizedTask,
    "",
    "Моё решение:",
    "```javascript",
    normalizedSolution,
    "```",
  ].join("\n");
}
