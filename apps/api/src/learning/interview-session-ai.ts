export interface GeneratedInterviewEvaluation {
  platformScore: number;
  aiScore: number;
  communicationScore: number;
  summary: string;
  strengths: string[];
  weakTopics: string[];
  recommendations: string[];
  platformFeedback: string;
  aiFeedback: string;
  communicationFeedback: string;
}

const asRecord = (value: unknown, label: string) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
};

const asText = (value: unknown, label: string, maxLength = 2_000) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim().slice(0, maxLength);
};

const asTextList = (value: unknown, label: string, limit = 8) => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.slice(0, limit).map((item, index) =>
    asText(item, `${label}.${index}`, 500),
  );
};

const asScore = (value: unknown, label: string) => {
  const score = Number(value);
  if (!Number.isFinite(score)) throw new Error(`${label} must be a number`);
  return Math.min(100, Math.max(0, Math.round(score)));
};

export function normalizeInterviewFollowUp(value: unknown) {
  return asText(asRecord(value, "followUp").question, "followUp.question", 800);
}

export function normalizeInterviewDefenseQuestions(value: unknown) {
  const questions = asTextList(
    asRecord(value, "defense").questions,
    "defense.questions",
    2,
  );
  if (questions.length !== 2) throw new Error("defense.questions must contain 2 items");
  return questions;
}

export function normalizeInterviewEvaluation(
  value: unknown,
): GeneratedInterviewEvaluation {
  const result = asRecord(value, "evaluation");
  return {
    platformScore: asScore(result.platformScore, "evaluation.platformScore"),
    aiScore: asScore(result.aiScore, "evaluation.aiScore"),
    communicationScore: asScore(
      result.communicationScore,
      "evaluation.communicationScore",
    ),
    summary: asText(result.summary, "evaluation.summary", 3_000),
    strengths: asTextList(result.strengths, "evaluation.strengths"),
    weakTopics: asTextList(result.weakTopics, "evaluation.weakTopics"),
    recommendations: asTextList(
      result.recommendations,
      "evaluation.recommendations",
    ),
    platformFeedback: asText(
      result.platformFeedback,
      "evaluation.platformFeedback",
    ),
    aiFeedback: asText(result.aiFeedback, "evaluation.aiFeedback"),
    communicationFeedback: asText(
      result.communicationFeedback,
      "evaluation.communicationFeedback",
    ),
  };
}
