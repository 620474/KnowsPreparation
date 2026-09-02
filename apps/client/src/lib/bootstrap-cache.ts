import type {
  TrackKey,
  AiLesson,
  BootstrapData,
  LessonQuizProgress,
  MockInterview,
  PracticeSolutionProgress,
} from "../types";
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
  track: TrackKey,
  itemId: string,
  progress: LessonQuizProgress,
): BootstrapData => ({
  ...current,
  ai: {
    ...current.ai,
    quizProgress: {
      ...current.ai.quizProgress,
      [track]: {
        ...current.ai.quizProgress[track],
        [itemId]: progress,
      },
    },
  },
});

export const updatePracticeProgress = (
  current: BootstrapData,
  track: TrackKey,
  itemId: string,
  progress: PracticeSolutionProgress,
): BootstrapData => ({
  ...current,
  ai: {
    ...current.ai,
    practiceProgress: {
      ...current.ai.practiceProgress,
      [track]: {
        ...current.ai.practiceProgress[track],
        [itemId]: progress,
      },
    },
  },
});

export const updateAiLesson = (
  current: BootstrapData,
  track: TrackKey,
  lesson: AiLesson,
): BootstrapData => ({
  ...current,
  ai: {
    ...current.ai,
    lessons: {
      ...current.ai.lessons,
      [track]: { ...current.ai.lessons[track], [lesson.itemId]: lesson },
    },
  },
});
