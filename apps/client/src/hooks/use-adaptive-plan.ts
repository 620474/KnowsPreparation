import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import {
  createOperationId,
  offlineMutationKeys,
  type SkipRecommendationMutationVariables,
} from "../lib/offline-mutation-keys";
import type { AdaptivePlan } from "../types";

export const ADAPTIVE_TODAY_QUERY_KEY = ["adaptive-today"] as const;

export function useAdaptivePlan(enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ADAPTIVE_TODAY_QUERY_KEY,
    queryFn: learningApi.getAdaptiveToday,
    enabled,
  });
  const skipMutation = useMutation<
    { skipped: boolean },
    Error,
    SkipRecommendationMutationVariables,
    { previous?: AdaptivePlan }
  >({
    mutationKey: offlineMutationKeys.skipRecommendation,
    mutationFn: ({ recommendationId, operationId }) =>
      learningApi.skipAdaptiveRecommendation(recommendationId, operationId),
    onMutate: async ({ recommendationId }) => {
      await queryClient.cancelQueries({ queryKey: ADAPTIVE_TODAY_QUERY_KEY });
      const previous = queryClient.getQueryData<AdaptivePlan>(
        ADAPTIVE_TODAY_QUERY_KEY,
      );
      queryClient.setQueryData<AdaptivePlan>(ADAPTIVE_TODAY_QUERY_KEY, (current) => {
        if (!current) return current;
        const items = current.items.filter((item) => item.id !== recommendationId);
        return {
          ...current,
          items,
          totalMinutes: items.reduce((sum, item) => sum + item.minutes, 0),
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ADAPTIVE_TODAY_QUERY_KEY, context.previous);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ADAPTIVE_TODAY_QUERY_KEY }),
  });

  return {
    plan: query.data,
    isPending: query.isPending,
    isFallback: query.isError,
    skip(recommendationId: string) {
      skipMutation.mutate({ recommendationId, operationId: createOperationId() });
    },
  };
}
