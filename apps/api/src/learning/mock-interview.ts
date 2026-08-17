import type { InterviewQuestion } from "./curriculum";
import type { QuestionStatus } from "./schemas/question-progress.schema";

interface ProgressForSelection {
  status?: QuestionStatus;
  lapseCount?: number;
  nextReviewAt?: Date | null;
}

export interface GeneratedMockEvaluation {
  overallScore: number;
  summary: string;
  strengths: string[];
  weakTopics: string[];
  questions: Array<{
    questionId: string;
    score: number;
    feedback: string;
    missingPoints: string[];
  }>;
}

const statusWeights: Record<QuestionStatus, number> = {
  new: 3,
  learning: 7,
  review: 5,
  mastered: 1,
};

const getQuestionWeight = (progress: ProgressForSelection | undefined, now: Date) => {
  const status = progress?.status ?? "new";
  const overdue = progress?.nextReviewAt && progress.nextReviewAt <= now ? 3 : 0;
  return statusWeights[status] + Math.min(6, (progress?.lapseCount ?? 0) * 2) + overdue;
};

export function selectMockInterviewQuestions(
  questions: InterviewQuestion[],
  progress: Map<string, ProgressForSelection>,
  count = 5,
  random = Math.random,
  now = new Date(),
) {
  const ranked = questions
    .map((question) => ({
      question,
      score: getQuestionWeight(progress.get(question.id), now) + random(),
    }))
    .sort((left, right) => right.score - left.score);
  const selected: InterviewQuestion[] = [];
  const selectedCategories = new Set<string>();

  for (const candidate of ranked) {
    if (selected.length >= count) break;
    if (selectedCategories.has(candidate.question.category)) continue;
    selected.push(candidate.question);
    selectedCategories.add(candidate.question.category);
  }

  for (const candidate of ranked) {
    if (selected.length >= count) break;
    if (selected.some((question) => question.id === candidate.question.id)) continue;
    selected.push(candidate.question);
  }

  return selected;
}

const asRecord = (value: unknown, label: string) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
};

const asText = (value: unknown, label: string, maxLength: number) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim().slice(0, maxLength);
};

const asTextList = (value: unknown, label: string, limit: number) => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.slice(0, limit).map((item, index) => asText(item, `${label}.${index}`, 500));
};

export function normalizeMockEvaluation(
  value: unknown,
  expectedQuestionIds: string[],
): GeneratedMockEvaluation {
  const evaluation = asRecord(value, "evaluation");
  if (!Array.isArray(evaluation.questions)) {
    throw new Error("evaluation.questions must be an array");
  }
  const questionMap = new Map(
    evaluation.questions.map((value, index) => {
      const question = asRecord(value, `evaluation.questions.${index}`);
      const questionId = asText(question.questionId, `evaluation.questions.${index}.questionId`, 80);
      const score = Number(question.score);
      if (!Number.isFinite(score)) throw new Error(`evaluation.questions.${index}.score is invalid`);
      return [
        questionId,
        {
          questionId,
          score: Math.min(5, Math.max(0, Math.round(score))),
          feedback: asText(question.feedback, `evaluation.questions.${index}.feedback`, 2_000),
          missingPoints: asTextList(
            question.missingPoints,
            `evaluation.questions.${index}.missingPoints`,
            8,
          ),
        },
      ] as const;
    }),
  );
  const questions = expectedQuestionIds.map((questionId) => {
    const result = questionMap.get(questionId);
    if (!result) throw new Error(`evaluation for ${questionId} is missing`);
    return result;
  });
  const overallScore = Number(evaluation.overallScore);
  if (!Number.isFinite(overallScore)) throw new Error("evaluation.overallScore is invalid");

  return {
    overallScore: Math.min(100, Math.max(0, Math.round(overallScore))),
    summary: asText(evaluation.summary, "evaluation.summary", 3_000),
    strengths: asTextList(evaluation.strengths, "evaluation.strengths", 8),
    weakTopics: asTextList(evaluation.weakTopics, "evaluation.weakTopics", 8),
    questions,
  };
}
