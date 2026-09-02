import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import {
  createOperationId,
  offlineMutationKeys,
  type MissionActionMutationVariables,
  type TransferAssessmentMutationVariables,
} from "../lib/offline-mutation-keys";
import { createDurableMutationFn } from "../lib/offline-mutations";
import type { LearningMissionAction } from "../types";

export const LEARNING_MISSIONS_QUERY_KEY = ["learning-missions"] as const;

export function useTodayMissions(target = "general") {
  return useQuery({
    queryKey: [...LEARNING_MISSIONS_QUERY_KEY, "today", target],
    queryFn: () => learningApi.getMissionsToday(target),
  });
}

export function useMission(missionId: string | null) {
  return useQuery({
    queryKey: [...LEARNING_MISSIONS_QUERY_KEY, "detail", missionId],
    queryFn: () => learningApi.getMission(missionId!),
    enabled: Boolean(missionId),
  });
}

export function useMissionActions(missionId: string) {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: LEARNING_MISSIONS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ["adaptive-today"] }),
      queryClient.invalidateQueries({ queryKey: ["knowledge-overview"] }),
    ]);
  };
  const actionMutation = useMutation({
    mutationKey: offlineMutationKeys.missionAction,
    mutationFn: createDurableMutationFn(
      "missionAction",
      ({ missionId: selectedMissionId, ...input }: MissionActionMutationVariables) =>
        learningApi.updateMission(selectedMissionId, input),
    ),
    onSuccess: (mission) => {
      queryClient.setQueryData(
        [...LEARNING_MISSIONS_QUERY_KEY, "detail", missionId],
        mission,
      );
    },
    onSettled: refresh,
  });
  const transferMutation = useMutation({
    mutationKey: offlineMutationKeys.transferAssessment,
    mutationFn: createDurableMutationFn(
      "transferAssessment",
      ({ missionId: selectedMissionId, ...input }: TransferAssessmentMutationVariables) =>
        learningApi.submitTransferAssessment(selectedMissionId, input),
    ),
    onSettled: refresh,
  });

  return {
    actionMutation,
    transferMutation,
    runAction(action: LearningMissionAction, options?: { deferredUntil?: string; note?: string }) {
      return actionMutation.mutateAsync({
        missionId,
        action,
        operationId: createOperationId(),
        ...options,
      });
    },
    submitTransfer(input: Omit<TransferAssessmentMutationVariables, "missionId" | "operationId">) {
      return transferMutation.mutateAsync({
        missionId,
        operationId: createOperationId(),
        ...input,
      });
    },
  };
}

