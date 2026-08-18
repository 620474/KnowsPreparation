import { useMutation, useQueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import {
  BOOTSTRAP_QUERY_KEY,
  buildOptimisticQuizProgress,
  type BootstrapMutationContext,
  updateQuizProgress,
} from "../lib/bootstrap-cache";
import { synchronizeDailyReminder } from "../lib/notifications";
import {
  createOperationId,
  offlineMutationKeys,
  type QuestionMutationVariables,
  type QuizMutationVariables,
  type ReviewMutationVariables,
  type SettingsMutationVariables,
  type TaskMutationVariables,
} from "../lib/offline-mutation-keys";
import { normalizeQuestionProgress } from "../lib/question-progress";
import { scheduleQuestionReview } from "../lib/spaced-repetition";
import type {
  AiChatScope,
  AppSettings,
  BootstrapData,
  LessonQuizProgress,
  QuestionProgress,
  ReviewRating,
  SettingsPatch,
  TaskProgress,
  TaskProgressPatch,
} from "../types";

interface UseProgressActionsOptions {
  online: boolean;
  setError: (message: string) => void;
}

export function useProgressActions({ online, setError }: UseProgressActionsOptions) {
  const queryClient = useQueryClient();

  const taskMutation = useMutation<
    TaskProgress & { taskId: string },
    Error,
    TaskMutationVariables,
    BootstrapMutationContext
  >({
    mutationKey: offlineMutationKeys.task,
    mutationFn: ({ taskId, progress }) => learningApi.updateTask(taskId, progress),
    onMutate: async ({ taskId, progress }) => {
      await queryClient.cancelQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      const previous = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY);
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current
          ? {
              ...current,
              progress: {
                ...current.progress,
                tasks: {
                  ...current.progress.tasks,
                  [taskId]: {
                    completed: false,
                    note: "",
                    customTask: "",
                    solution: "",
                    ...current.progress.tasks[taskId],
                    ...progress,
                  },
                },
              },
            }
          : current,
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BOOTSTRAP_QUERY_KEY, context.previous);
      }
      setError(error.message || "Не удалось сохранить задание");
    },
  });

  const questionMutation = useMutation<
    QuestionProgress & { questionId: string },
    Error,
    QuestionMutationVariables,
    BootstrapMutationContext
  >({
    mutationKey: offlineMutationKeys.question,
    mutationFn: ({ questionId, progress }) =>
      learningApi.updateQuestion(questionId, progress),
    onMutate: async ({ questionId, progress }) => {
      await queryClient.cancelQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      const previous = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY);
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current
          ? {
              ...current,
              progress: {
                ...current.progress,
                questions: { ...current.progress.questions, [questionId]: progress },
              },
            }
          : current,
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BOOTSTRAP_QUERY_KEY, context.previous);
      }
      setError(error.message || "Не удалось сохранить вопрос");
    },
  });

  const reviewMutation = useMutation<
    QuestionProgress & { questionId: string },
    Error,
    ReviewMutationVariables,
    BootstrapMutationContext
  >({
    mutationKey: offlineMutationKeys.review,
    mutationFn: ({ questionId, rating, note, operationId }) =>
      learningApi.reviewQuestion(questionId, rating, note, operationId),
    onMutate: async ({ questionId, rating, note }) => {
      await queryClient.cancelQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      const previous = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY);
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) => {
        if (!current) return current;
        const progress = scheduleQuestionReview(
          normalizeQuestionProgress(current.progress.questions[questionId]),
          rating,
        );
        return {
          ...current,
          progress: {
            ...current.progress,
            questions: {
              ...current.progress.questions,
              [questionId]: { ...progress, note },
            },
          },
        };
      });
      return { previous };
    },
    onSuccess: ({ questionId, ...progress }) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current
          ? {
              ...current,
              progress: {
                ...current.progress,
                questions: { ...current.progress.questions, [questionId]: progress },
              },
            }
          : current,
      );
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BOOTSTRAP_QUERY_KEY, context.previous);
      }
      setError(error.message);
    },
  });

  const quizMutation = useMutation<
    LessonQuizProgress,
    Error,
    QuizMutationVariables,
    BootstrapMutationContext
  >({
    mutationKey: offlineMutationKeys.quiz,
    mutationFn: ({ scope, itemId, answers, operationId }) =>
      learningApi.submitLessonQuiz(scope, itemId, answers, operationId),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      const previous = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY);
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) => {
        if (!current) return current;
        const progress = buildOptimisticQuizProgress(current, variables);
        return progress
          ? updateQuizProgress(current, variables.scope, variables.itemId, progress)
          : current;
      });
      return { previous };
    },
    onSuccess: (progress, { scope, itemId }) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current ? updateQuizProgress(current, scope, itemId, progress) : current,
      );
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BOOTSTRAP_QUERY_KEY, context.previous);
      }
      setError(error.message);
    },
  });

  const settingsMutation = useMutation<
    AppSettings,
    Error,
    SettingsMutationVariables,
    BootstrapMutationContext
  >({
    mutationKey: offlineMutationKeys.settings,
    mutationFn: learningApi.updateSettings,
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      const previous = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY);
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current
          ? { ...current, settings: { ...current.settings, ...settings } }
          : current,
      );
      return { previous };
    },
    onSuccess: (settings) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current ? { ...current, settings } : current,
      );
    },
    onError: (error, _settings, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BOOTSTRAP_QUERY_KEY, context.previous);
      }
      setError(error.message || "Не удалось сохранить настройки");
    },
  });

  const updateTask = async (taskId: string, progress: TaskProgressPatch) => {
    setError("");
    if (!online) {
      taskMutation.mutate({ taskId, progress });
      return true;
    }
    try {
      await taskMutation.mutateAsync({ taskId, progress });
      return true;
    } catch {
      return false;
    }
  };

  const updateQuestion = (questionId: string, progress: QuestionProgress) => {
    setError("");
    questionMutation.mutate({ questionId, progress });
  };

  const reviewQuestion = async (
    questionId: string,
    rating: ReviewRating,
    note: string,
  ) => {
    setError("");
    const variables = { questionId, rating, note, operationId: createOperationId() };
    if (!online) {
      reviewMutation.mutate(variables);
      return true;
    }
    try {
      await reviewMutation.mutateAsync(variables);
      return true;
    } catch {
      return false;
    }
  };

  const submitLessonQuiz = async (
    scope: AiChatScope,
    itemId: string,
    answers: QuizMutationVariables["answers"],
  ) => {
    setError("");
    const variables = { scope, itemId, answers, operationId: createOperationId() };
    if (!online) {
      const current = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY);
      const optimisticProgress = current
        ? buildOptimisticQuizProgress(current, variables)
        : null;
      quizMutation.mutate(variables);
      return optimisticProgress;
    }
    try {
      return await quizMutation.mutateAsync(variables);
    } catch {
      return null;
    }
  };

  const updateSettings = async (settings: SettingsPatch) => {
    setError("");
    const currentSettings = queryClient.getQueryData<BootstrapData>(
      BOOTSTRAP_QUERY_KEY,
    )?.settings;
    if (!currentSettings) return false;
    const nextSettings = { ...currentSettings, ...settings };
    if (
      settings.reminderEnabled !== undefined ||
      settings.reminderTime !== undefined
    ) {
      try {
        await synchronizeDailyReminder(
          nextSettings,
          settings.reminderEnabled === true,
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Не удалось настроить напоминание",
        );
        return false;
      }
    }
    if (!online) {
      settingsMutation.mutate(settings);
      return true;
    }
    try {
      await settingsMutation.mutateAsync(settings);
      return true;
    } catch {
      return false;
    }
  };

  return {
    updateTask,
    updateQuestion,
    reviewQuestion,
    submitLessonQuiz,
    updateSettings,
  };
}
