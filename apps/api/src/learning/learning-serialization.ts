import {
  aiLessonSchema,
  practiceAttemptSchema,
  practiceSolutionProgressSchema,
  TRACK_KEYS,
  type TrackKey,
  type TrackRecord,
} from "@prep/contracts";

import { QUESTION_BANK } from "./curriculum";

import type { AiCourse, AiLesson } from "./schemas/ai-course.schema";
import type { AiPracticeProgress } from "./schemas/ai-practice-progress.schema";
import type { AiQuizProgress } from "./schemas/ai-quiz-progress.schema";
import type { MockInterview } from "./schemas/mock-interview.schema";
import type { QuestionProgress } from "./schemas/question-progress.schema";
import type { PracticeAttempt } from "./schemas/practice-attempt.schema";
import { findStaticTrackByCourse } from "./track-registry";

interface TrackScopedDocument {
  courseKey: string;
  courseVersion: number;
  itemId: string;
}

/** Определяет, какому треку принадлежит документ, или null для устаревших версий. */
function resolveTrackKey(
  document: TrackScopedDocument,
  aiCourse: AiCourse | null,
): TrackKey | null {
  const staticTrack = findStaticTrackByCourse(
    document.courseKey,
    document.courseVersion,
  );
  if (staticTrack) return staticTrack.key;
  if (
    aiCourse &&
    document.courseKey === aiCourse.key &&
    document.courseVersion === aiCourse.version
  ) {
    return "course";
  }
  return null;
}

/**
 * Раскладывает документы по трекам. Документы отсортированы по убыванию
 * updatedAt, поэтому первым в каждый itemId попадает самый свежий.
 */
function groupByTrack<TDocument extends TrackScopedDocument, TResult>(
  documents: TDocument[],
  aiCourse: AiCourse | null,
  serialize: (document: TDocument) => TResult,
): TrackRecord<TResult> {
  const result = Object.fromEntries(
    TRACK_KEYS.map((track) => [track, {}]),
  ) as TrackRecord<TResult>;
  for (const document of documents) {
    const track = resolveTrackKey(document, aiCourse);
    if (!track || result[track][document.itemId]) continue;
    result[track][document.itemId] = serialize(document);
  }
  return result;
}

export function serializeAiCourse(course: AiCourse) {
  return {
    title: course.title,
    summary: course.summary,
    goal: course.goal,
    level: course.level,
    deadline: course.deadline,
    dailyMinutes: course.dailyMinutes,
    targetCompanies: course.targetCompanies,
    weakTopics: course.weakTopics,
    version: course.version,
    generatedAt: course.generatedAt,
    items: course.items.map((item) => ({
      id: item.id,
      title: item.title,
      objective: item.objective,
      estimatedMinutes: item.estimatedMinutes,
      resourceIds: item.resourceIds,
    })),
  };
}

export function serializeAiLesson(lesson: AiLesson) {
  return aiLessonSchema.parse({
    itemId: lesson.itemId,
    title: lesson.title,
    goals: lesson.goals,
    explanation: lesson.explanation,
    codeExamples: lesson.codeExamples,
    diagrams: lesson.diagrams ?? [],
    commonMistakes: lesson.commonMistakes,
    interviewQuestions: lesson.interviewQuestions,
    practice: lesson.practice,
    quiz: lesson.quiz ?? [],
    summary: lesson.summary,
    resourceIds: lesson.resourceIds,
    courseVersion: lesson.courseVersion,
    version: lesson.version,
    generatedAt: lesson.generatedAt,
  });
}

export function serializePracticeProgress(progress: AiPracticeProgress) {
  return practiceSolutionProgressSchema.parse({
    itemId: progress.itemId,
    courseVersion: progress.courseVersion,
    lessonVersion: progress.lessonVersion,
    solution: progress.solution,
    revision: progress.revision,
    updatedAt: progress.updatedAt.toISOString(),
  });
}

export function serializePracticeAttempt(
  attempt: PracticeAttempt & { _id: unknown },
) {
  return practiceAttemptSchema.parse({
    id: String(attempt._id),
    track: attempt.track,
    itemId: attempt.itemId,
    source: attempt.source,
    exerciseVersion: attempt.exerciseVersion,
    skillKeys: attempt.skillKeys ?? [],
    solution: attempt.solution,
    passed: attempt.passed,
    passedCount: attempt.passedCount,
    totalCount: attempt.totalCount,
    durationMs: attempt.durationMs,
    error: attempt.error ?? null,
    tests: attempt.tests.map((test) => ({
      title: test.title,
      passed: test.passed,
      ...(test.error ? { error: test.error } : {}),
    })),
    createdAt: attempt.createdAt.toISOString(),
  });
}

export function serializePracticeProgressCollection(
  progresses: AiPracticeProgress[],
  aiCourse: AiCourse | null,
) {
  return groupByTrack(progresses, aiCourse, serializePracticeProgress);
}

export function serializeQuestionProgress(question: QuestionProgress) {
  return {
    status: question.status ?? "new",
    note: question.note ?? "",
    easeFactor: question.easeFactor ?? 2.5,
    intervalDays: question.intervalDays ?? 0,
    repetitions: question.repetitions ?? 0,
    nextReviewAt: question.nextReviewAt?.toISOString() ?? null,
    lastReviewedAt: question.lastReviewedAt?.toISOString() ?? null,
    reviewCount: question.reviewCount ?? 0,
    lapseCount: question.lapseCount ?? 0,
    lastRating: question.lastRating ?? null,
  };
}

export function serializeQuizProgress(progress: AiQuizProgress) {
  return {
    itemId: progress.itemId,
    lessonVersion: progress.lessonVersion,
    attempts: progress.attempts.map((attempt) => ({
      score: attempt.score,
      answers: attempt.answers.map((answer) => ({
        questionId: answer.questionId,
        selectedOptionIndex: answer.selectedOptionIndex,
        correct: answer.correct,
        topic: answer.topic,
      })),
      completedAt: attempt.completedAt.toISOString(),
    })),
  };
}

export function serializeQuizProgressCollection(
  progresses: AiQuizProgress[],
  aiCourse: AiCourse | null,
) {
  return groupByTrack(progresses, aiCourse, serializeQuizProgress);
}

/** Раскладывает сгенерированные уроки по трекам для ответа bootstrap. */
export function serializeLessonCollection(
  lessons: AiLesson[],
  aiCourse: AiCourse | null,
) {
  return groupByTrack(lessons, aiCourse, serializeAiLesson);
}

export function serializeMockInterview(interview: MockInterview & { _id: unknown }) {
  const questionMap = new Map(QUESTION_BANK.map((question) => [question.id, question]));
  return {
    id: String(interview._id),
    status: interview.status,
    durationMinutes: interview.durationMinutes,
    startedAt: interview.startedAt.toISOString(),
    completedAt: interview.completedAt?.toISOString() ?? null,
    questions: interview.questionIds.flatMap((questionId) => {
      const question = questionMap.get(questionId);
      return question ? [question] : [];
    }),
    answers: Object.fromEntries(
      interview.answers.map((answer) => [answer.questionId, answer.content]),
    ),
    evaluation: interview.evaluation
      ? {
          overallScore: interview.evaluation.overallScore,
          summary: interview.evaluation.summary,
          strengths: interview.evaluation.strengths,
          weakTopics: interview.evaluation.weakTopics,
          questions: interview.evaluation.questions,
        }
      : null,
  };
}
