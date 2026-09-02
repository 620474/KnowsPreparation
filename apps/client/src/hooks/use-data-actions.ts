import { useMutation, useQueryClient } from "@tanstack/react-query";

import { learningApi } from "../api";
import {
  BOOTSTRAP_QUERY_KEY,
  type BootstrapMutationContext,
} from "../lib/bootstrap-cache";
import { saveBackupFile, type PortableBackup } from "../lib/backup";
import { offlineMutationKeys } from "../lib/offline-mutation-keys";
import { restorePracticeDrafts } from "../lib/practice-drafts";
import type { AlgorithmEntry, BootstrapData } from "../types";

interface UseDataActionsOptions {
  setError: (message: string) => void;
}

export function useDataActions({ setError }: UseDataActionsOptions) {
  const queryClient = useQueryClient();

  const addAlgorithmMutation = useMutation<
    AlgorithmEntry,
    Error,
    Omit<AlgorithmEntry, "id">
  >({
    mutationFn: learningApi.addAlgorithm,
    onSuccess: (entry) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current ? { ...current, algorithms: [entry, ...current.algorithms] } : current,
      );
    },
    onError: (error) => setError(error.message || "Не удалось добавить задачу"),
  });

  const deleteAlgorithmMutation = useMutation<
    { deleted: boolean },
    Error,
    string,
    BootstrapMutationContext
  >({
    mutationKey: offlineMutationKeys.deleteAlgorithm,
    mutationFn: learningApi.deleteAlgorithm,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      const previous = queryClient.getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY);
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current
          ? {
              ...current,
              algorithms: current.algorithms.filter((entry) => entry.id !== id),
            }
          : current,
      );
      return { previous };
    },
    onSuccess: (_result, id) => {
      queryClient.setQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY, (current) =>
        current
          ? {
              ...current,
              algorithms: current.algorithms.filter((entry) => entry.id !== id),
            }
          : current,
      );
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BOOTSTRAP_QUERY_KEY, context.previous);
      }
      setError(error.message || "Не удалось удалить задачу");
    },
  });

  const exportBackup = async () => {
    setError("");
    try {
      await saveBackupFile(await learningApi.exportBackup());
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось создать бэкап");
      return false;
    }
  };

  const importBackup = async (backup: PortableBackup) => {
    setError("");
    try {
      const result = await learningApi.importBackup(backup.server);
      const localDraftCount = await restorePracticeDrafts(backup.localPracticeDrafts);
      await queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      return result.total + localDraftCount;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Не удалось восстановить бэкап",
      );
      return null;
    }
  };

  return {
    addAlgorithm: (entry: Omit<AlgorithmEntry, "id">) => {
      setError("");
      addAlgorithmMutation.mutate(entry);
    },
    deleteAlgorithm: deleteAlgorithmMutation.mutate,
    exportBackup,
    importBackup,
  };
}
