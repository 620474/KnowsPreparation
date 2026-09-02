import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import {
  createOperationId,
  offlineMutationKeys,
  type PracticeAttemptMutationVariables,
} from "../lib/offline-mutation-keys";
import type {
  PracticeAttempt,
  PracticeAttemptHistory,
  PracticeAttemptSource,
  PracticeAttemptTelemetry,
  TrackKey,
} from "../types";

export interface PracticeAttemptTarget {
  track: TrackKey;
  itemId: string;
  source: PracticeAttemptSource;
  lessonVersion?: number;
}

const historyQueryKey = (target: PracticeAttemptTarget | undefined) => [
  "practice-attempts",
  target?.track ?? null,
  target?.itemId ?? null,
  target?.source ?? null,
  target?.lessonVersion ?? null,
] as const;

export function usePracticeAttempts(target: PracticeAttemptTarget | undefined) {
  const queryClient = useQueryClient();
  const queryKey = historyQueryKey(target);
  const history = useQuery({
    queryKey,
    enabled: Boolean(target),
    queryFn: () => {
      if (!target) return Promise.resolve({ attempts: [] });
      return learningApi.getPracticeAttempts(
        target.track,
        target.itemId,
        target.source,
      );
    },
  });
  const mutation = useMutation<
    PracticeAttempt,
    Error,
    PracticeAttemptMutationVariables
  >({
    mutationKey: offlineMutationKeys.practiceAttempt,
    mutationFn: ({
      track,
      itemId,
      source,
      lessonVersion,
      solution,
      telemetry,
      operationId,
    }) =>
      learningApi.submitPracticeAttempt(
        track,
        itemId,
        source,
        lessonVersion,
        solution,
        operationId,
        telemetry,
      ),
    onSuccess: (attempt) => {
      queryClient.setQueryData<PracticeAttemptHistory>(queryKey, (current) => ({
        attempts: [
          attempt,
          ...(current?.attempts ?? []).filter((item) => item.id !== attempt.id),
        ].slice(0, 10),
      }));
      void queryClient.invalidateQueries({ queryKey: ["adaptive-today"] });
      void queryClient.invalidateQueries({ queryKey: ["learning-analytics"] });
    },
  });

  return {
    history: history.data?.attempts ?? [],
    historyError: history.error,
    mutation,
    submit(solution: string, telemetry?: PracticeAttemptTelemetry) {
      if (!target) return;
      mutation.mutate({
        ...target,
        solution,
        telemetry,
        operationId: createOperationId(),
      });
    },
  };
}
