import { QUESTION_BANK } from "./curriculum";
import type { AiCourse, AiLesson } from "./schemas/ai-course.schema";
import type { AiQuizProgress } from "./schemas/ai-quiz-progress.schema";
import type { MockInterview } from "./schemas/mock-interview.schema";
import type { QuestionProgress } from "./schemas/question-progress.schema";
import { findSprintTrackByCourse } from "./track-registry";

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
  return {
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
    version: lesson.version,
    generatedAt: lesson.generatedAt,
  };
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
  const result = {
    course: {} as Record<string, ReturnType<typeof serializeQuizProgress>>,
    yandex: {} as Record<string, ReturnType<typeof serializeQuizProgress>>,
    ozon: {} as Record<string, ReturnType<typeof serializeQuizProgress>>,
  };
  for (const progress of progresses) {
    const sprintTrack = findSprintTrackByCourse(
      progress.courseKey,
      progress.courseVersion,
    );
    const scope = sprintTrack
      ? sprintTrack.scope
      : aiCourse &&
          progress.courseKey === aiCourse.key &&
          progress.courseVersion === aiCourse.version
        ? "course"
        : null;
    if (!scope || result[scope][progress.itemId]) continue;
    result[scope][progress.itemId] = serializeQuizProgress(progress);
  }
  return result;
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
