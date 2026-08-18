import type {
  AiChatScope,
  AiLesson,
  BootstrapData,
  LessonQuizProgress,
  MockInterview,
  PracticeSolutionProgress,
} from "../types";
import type { QuizMutationVariables } from "./offline-mutation-keys";

export const BOOTSTRAP_QUERY_KEY = ["bootstrap"] as const;
export type BootstrapMutationContext = { previous?: BootstrapData };

export const updateMockInterviews = (
  current: BootstrapData,
  interview: MockInterview,
): BootstrapData => ({
  ...current,
  mockInterviews: [
    interview,
    ...current.mockInterviews.filter((item) => item.id !== interview.id),
  ].slice(0, 20),
});

export const updateQuizProgress = (
  current: BootstrapData,
  scope: AiChatScope,
  itemId: string,
  progress: LessonQuizProgress,
): BootstrapData => ({
  ...current,
  ai: {
    ...current.ai,
    quizProgress: {
      ...current.ai.quizProgress,
      [scope]: {
        ...current.ai.quizProgress[scope],
        [itemId]: progress,
      },
    },
  },
});

export const updatePracticeProgress = (
  current: BootstrapData,
  scope: AiChatScope,
  itemId: string,
  progress: PracticeSolutionProgress,
): BootstrapData => ({
  ...current,
  ai: {
    ...current.ai,
    practiceProgress: {
      ...current.ai.practiceProgress,
      [scope]: {
        ...current.ai.practiceProgress[scope],
        [itemId]: progress,
      },
    },
  },
});

export const updateAiLesson = (
  current: BootstrapData,
  scope: AiChatScope,
  lesson: AiLesson,
): BootstrapData => {
  if (scope === "course") {
    return {
      ...current,
      ai: {
        ...current.ai,
        lessons: { ...current.ai.lessons, [lesson.itemId]: lesson },
      },
    };
  }
  if (scope === "yandex") {
    return {
      ...current,
      ai: {
        ...current.ai,
        yandexLessons: {
          ...current.ai.yandexLessons,
          [lesson.itemId]: lesson,
        },
      },
    };
  }
  return {
    ...current,
    ai: {
      ...current.ai,
      ozonLessons: { ...current.ai.ozonLessons, [lesson.itemId]: lesson },
    },
  };
};

export const buildOptimisticQuizProgress = (
  current: BootstrapData,
  variables: QuizMutationVariables,
): LessonQuizProgress | null => {
  const lesson =
    variables.scope === "course"
      ? current.ai.lessons[variables.itemId]
      : variables.scope === "yandex"
        ? current.ai.yandexLessons[variables.itemId]
        : current.ai.ozonLessons[variables.itemId];
  if (!lesson || lesson.quiz.length !== 10) return null;
  const submitted = new Map(
    variables.answers.map((answer) => [answer.questionId, answer.selectedOptionIndex]),
  );
  if (submitted.size !== lesson.quiz.length) return null;
  const answers = lesson.quiz.map((question) => {
    const selectedOptionIndex = submitted.get(question.id);
    if (selectedOptionIndex === undefined) return null;
    return {
      questionId: question.id,
      selectedOptionIndex,
      correct: selectedOptionIndex === question.correctOptionIndex,
      topic: question.topic,
    };
  });
  if (answers.some((answer) => answer === null)) return null;
  const previous = current.ai.quizProgress[variables.scope][variables.itemId];
  const previousAttempts =
    previous?.lessonVersion === lesson.version ? previous.attempts : [];
  return {
    itemId: variables.itemId,
    lessonVersion: lesson.version,
    attempts: [
      ...previousAttempts,
      {
        score: answers.filter((answer) => answer?.correct).length,
        answers: answers.filter((answer) => answer !== null),
        completedAt: new Date().toISOString(),
      },
    ],
  };
};
