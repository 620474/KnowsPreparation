import type { QueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import { offlineMutationKeys } from "./offline-mutation-keys";
import type {
  MockAnswerMutationVariables,
  PracticeAttemptMutationVariables,
  QuestionMutationVariables,
  QuizMutationVariables,
  ReviewMutationVariables,
  SettingsMutationVariables,
  SkipRecommendationMutationVariables,
  TaskMutationVariables,
} from "./offline-mutation-keys";

const OFFLINE_WRITE_SCOPE = { id: "offline-write-queue" } as const;
const offlineOptions = {
  networkMode: "online" as const,
  retry: 3,
  scope: OFFLINE_WRITE_SCOPE,
};

export function registerOfflineMutationDefaults(queryClient: QueryClient) {
  const refreshLearning = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
      queryClient.invalidateQueries({ queryKey: ["adaptive-today"] }),
      queryClient.invalidateQueries({ queryKey: ["learning-analytics"] }),
    ]);

  queryClient.setMutationDefaults(offlineMutationKeys.task, {
    ...offlineOptions,
    mutationFn: ({ taskId, progress }: TaskMutationVariables) =>
      learningApi.updateTask(taskId, progress),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.question, {
    ...offlineOptions,
    mutationFn: ({ questionId, progress }: QuestionMutationVariables) =>
      learningApi.updateQuestion(questionId, progress),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.review, {
    ...offlineOptions,
    mutationFn: ({ questionId, rating, note, operationId }: ReviewMutationVariables) =>
      learningApi.reviewQuestion(questionId, rating, note, operationId),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.quiz, {
    ...offlineOptions,
    mutationFn: ({ track, itemId, answers, operationId }: QuizMutationVariables) =>
      learningApi.submitLessonQuiz(track, itemId, answers, operationId),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.practiceAttempt, {
    ...offlineOptions,
    mutationFn: ({
      track,
      itemId,
      source,
      lessonVersion,
      solution,
      operationId,
    }: PracticeAttemptMutationVariables) =>
      learningApi.submitPracticeAttempt(
        track,
        itemId,
        source,
        lessonVersion,
        solution,
        operationId,
      ),
    onSuccess: (_attempt, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [
          "practice-attempts",
          variables.track,
          variables.itemId,
          variables.source,
          variables.lessonVersion ?? null,
        ],
      });
      void queryClient.invalidateQueries({ queryKey: ["adaptive-today"] });
      void queryClient.invalidateQueries({ queryKey: ["learning-analytics"] });
    },
  });
  queryClient.setMutationDefaults(offlineMutationKeys.mockAnswer, {
    ...offlineOptions,
    mutationFn: ({ interviewId, questionId, content }: MockAnswerMutationVariables) =>
      learningApi.updateMockAnswer(interviewId, questionId, content),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.settings, {
    ...offlineOptions,
    mutationFn: (settings: SettingsMutationVariables) => learningApi.updateSettings(settings),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.deleteAlgorithm, {
    ...offlineOptions,
    mutationFn: (id: string) => learningApi.deleteAlgorithm(id),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.skipRecommendation, {
    ...offlineOptions,
    mutationFn: ({
      recommendationId,
      operationId,
    }: SkipRecommendationMutationVariables) =>
      learningApi.skipAdaptiveRecommendation(recommendationId, operationId),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["adaptive-today"] }),
  });
}
