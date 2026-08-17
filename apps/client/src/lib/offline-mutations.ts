import type { QueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import { offlineMutationKeys } from "./offline-mutation-keys";
import type {
  MockAnswerMutationVariables,
  QuestionMutationVariables,
  QuizMutationVariables,
  ReviewMutationVariables,
  TaskMutationVariables,
} from "./offline-mutation-keys";

const OFFLINE_WRITE_SCOPE = { id: "offline-write-queue" } as const;
const offlineOptions = {
  networkMode: "online" as const,
  retry: 3,
  scope: OFFLINE_WRITE_SCOPE,
};

export function registerOfflineMutationDefaults(queryClient: QueryClient) {
  const refreshBootstrap = () =>
    queryClient.invalidateQueries({ queryKey: ["bootstrap"] });

  queryClient.setMutationDefaults(offlineMutationKeys.task, {
    ...offlineOptions,
    mutationFn: ({ taskId, progress }: TaskMutationVariables) =>
      learningApi.updateTask(taskId, progress),
    onSettled: refreshBootstrap,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.question, {
    ...offlineOptions,
    mutationFn: ({ questionId, progress }: QuestionMutationVariables) =>
      learningApi.updateQuestion(questionId, progress),
    onSettled: refreshBootstrap,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.review, {
    ...offlineOptions,
    mutationFn: ({ questionId, rating, note, operationId }: ReviewMutationVariables) =>
      learningApi.reviewQuestion(questionId, rating, note, operationId),
    onSettled: refreshBootstrap,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.quiz, {
    ...offlineOptions,
    mutationFn: ({ scope, itemId, answers, operationId }: QuizMutationVariables) =>
      learningApi.submitLessonQuiz(scope, itemId, answers, operationId),
    onSettled: refreshBootstrap,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.mockAnswer, {
    ...offlineOptions,
    mutationFn: ({ interviewId, questionId, content }: MockAnswerMutationVariables) =>
      learningApi.updateMockAnswer(interviewId, questionId, content),
    onSettled: refreshBootstrap,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.settings, {
    ...offlineOptions,
    mutationFn: (startDate: string) => learningApi.updateSettings(startDate),
    onSettled: refreshBootstrap,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.deleteAlgorithm, {
    ...offlineOptions,
    mutationFn: (id: string) => learningApi.deleteAlgorithm(id),
    onSettled: refreshBootstrap,
  });
}
