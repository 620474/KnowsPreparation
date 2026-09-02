import type { QueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import {
  replayMutationOutbox,
  runDurableMutation,
  type DurableMutationKind,
  type MutationOutboxEntry,
} from "./mutation-outbox";
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
  networkMode: "always" as const,
  retry: 0,
  scope: OFFLINE_WRITE_SCOPE,
};

export const createDurableMutationFn = <TVariables, TResult>(
  kind: DurableMutationKind,
  execute: (variables: TVariables) => Promise<TResult>,
) => (variables: TVariables) =>
  runDurableMutation(kind, variables, () => execute(variables));

const executeOutboxEntry = (entry: MutationOutboxEntry) => {
  switch (entry.kind) {
    case "task": {
      const { taskId, progress } = entry.variables as TaskMutationVariables;
      return learningApi.updateTask(taskId, progress);
    }
    case "question": {
      const { questionId, progress } = entry.variables as QuestionMutationVariables;
      return learningApi.updateQuestion(questionId, progress);
    }
    case "review": {
      const { questionId, rating, note, operationId } = entry.variables as ReviewMutationVariables;
      return learningApi.reviewQuestion(questionId, rating, note, operationId);
    }
    case "quiz": {
      const { track, itemId, answers, operationId } = entry.variables as QuizMutationVariables;
      return learningApi.submitLessonQuiz(track, itemId, answers, operationId);
    }
    case "practiceAttempt": {
      const variables = entry.variables as PracticeAttemptMutationVariables;
      return learningApi.submitPracticeAttempt(
        variables.track,
        variables.itemId,
        variables.source,
        variables.lessonVersion,
        variables.solution,
        variables.operationId,
        variables.telemetry,
      );
    }
    case "mockAnswer": {
      const { interviewId, questionId, content } = entry.variables as MockAnswerMutationVariables;
      return learningApi.updateMockAnswer(interviewId, questionId, content);
    }
    case "settings":
      return learningApi.updateSettings(entry.variables as SettingsMutationVariables);
    case "deleteAlgorithm":
      return learningApi.deleteAlgorithm(entry.variables as string);
    case "skipRecommendation": {
      const { recommendationId, operationId } = entry.variables as SkipRecommendationMutationVariables;
      return learningApi.skipAdaptiveRecommendation(recommendationId, operationId);
    }
  }
};

let replayInFlight: Promise<number> | null = null;

export function replayOfflineMutationOutbox(queryClient: QueryClient) {
  if (replayInFlight) return replayInFlight;
  replayInFlight = replayMutationOutbox(executeOutboxEntry)
    .then(async (completed) => {
      if (completed > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
          queryClient.invalidateQueries({ queryKey: ["adaptive-today"] }),
          queryClient.invalidateQueries({ queryKey: ["learning-analytics"] }),
        ]);
      }
      return completed;
    })
    .finally(() => {
      replayInFlight = null;
    });
  return replayInFlight;
}

export function registerOfflineMutationDefaults(queryClient: QueryClient) {
  const refreshLearning = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
      queryClient.invalidateQueries({ queryKey: ["adaptive-today"] }),
      queryClient.invalidateQueries({ queryKey: ["learning-analytics"] }),
    ]);

  queryClient.setMutationDefaults(offlineMutationKeys.task, {
    ...offlineOptions,
    mutationFn: createDurableMutationFn("task", ({ taskId, progress }: TaskMutationVariables) =>
      learningApi.updateTask(taskId, progress)),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.question, {
    ...offlineOptions,
    mutationFn: createDurableMutationFn("question", ({ questionId, progress }: QuestionMutationVariables) =>
      learningApi.updateQuestion(questionId, progress)),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.review, {
    ...offlineOptions,
    mutationFn: createDurableMutationFn("review", ({ questionId, rating, note, operationId }: ReviewMutationVariables) =>
      learningApi.reviewQuestion(questionId, rating, note, operationId)),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.quiz, {
    ...offlineOptions,
    mutationFn: createDurableMutationFn("quiz", ({ track, itemId, answers, operationId }: QuizMutationVariables) =>
      learningApi.submitLessonQuiz(track, itemId, answers, operationId)),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults<unknown, Error, PracticeAttemptMutationVariables>(
    offlineMutationKeys.practiceAttempt,
    {
    ...offlineOptions,
    mutationFn: createDurableMutationFn("practiceAttempt", ({
      track,
      itemId,
      source,
      lessonVersion,
      solution,
      telemetry,
      operationId,
    }: PracticeAttemptMutationVariables) =>
      learningApi.submitPracticeAttempt(
        track,
        itemId,
        source,
        lessonVersion,
        solution,
        operationId,
        telemetry,
      )),
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
    },
  );
  queryClient.setMutationDefaults(offlineMutationKeys.mockAnswer, {
    ...offlineOptions,
    mutationFn: createDurableMutationFn("mockAnswer", ({ interviewId, questionId, content }: MockAnswerMutationVariables) =>
      learningApi.updateMockAnswer(interviewId, questionId, content)),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.settings, {
    ...offlineOptions,
    mutationFn: createDurableMutationFn("settings", (settings: SettingsMutationVariables) => learningApi.updateSettings(settings)),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.deleteAlgorithm, {
    ...offlineOptions,
    mutationFn: createDurableMutationFn("deleteAlgorithm", (id: string) => learningApi.deleteAlgorithm(id)),
    onSettled: refreshLearning,
  });
  queryClient.setMutationDefaults(offlineMutationKeys.skipRecommendation, {
    ...offlineOptions,
    mutationFn: createDurableMutationFn("skipRecommendation", ({
      recommendationId,
      operationId,
    }: SkipRecommendationMutationVariables) =>
      learningApi.skipAdaptiveRecommendation(recommendationId, operationId)),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["adaptive-today"] }),
  });
}
