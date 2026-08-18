import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";

import { isOfflineMutationKey } from "./offline-mutation-keys";
import { openClientDatabase, QUERY_CACHE_STORE } from "./client-database";

const CACHE_KEY = "main";
const MAX_AGE = 7 * 24 * 60 * 60 * 1_000;

interface PersistedQueryCache {
  timestamp: number;
  state: DehydratedState;
}

export const isFreshQueryCache = (timestamp: number, now = Date.now()) =>
  now - timestamp <= MAX_AGE;

const readCache = async () => {
  const database = await openClientDatabase();
  return new Promise<PersistedQueryCache | undefined>((resolve, reject) => {
    const transaction = database.transaction(QUERY_CACHE_STORE, "readonly");
    const request = transaction.objectStore(QUERY_CACHE_STORE).get(CACHE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as PersistedQueryCache | undefined);
    transaction.oncomplete = () => database.close();
  });
};

const writeCache = async (cache: PersistedQueryCache) => {
  const database = await openClientDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(QUERY_CACHE_STORE, "readwrite");
    transaction.objectStore(QUERY_CACHE_STORE).put(cache, CACHE_KEY);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
  database.close();
};

export async function restoreQueryCache(queryClient: QueryClient) {
  if (!("indexedDB" in window)) return;
  try {
    const cache = await readCache();
    if (cache && isFreshQueryCache(cache.timestamp)) hydrate(queryClient, cache.state);
  } catch {
    return;
  }
}

export function subscribeToQueryCache(queryClient: QueryClient) {
  let timeout: number | undefined;
  const scheduleWrite = () => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      const state = dehydrate(queryClient, {
        shouldDehydrateMutation: (mutation) =>
          mutation.state.isPaused && isOfflineMutationKey(mutation.options.mutationKey),
        shouldDehydrateQuery: (query) => {
          const rootKey = query.queryKey[0];
          return Boolean(query.state.data) && (rootKey === "bootstrap" || rootKey === "ai-chat");
        },
      });
      void writeCache({ timestamp: Date.now(), state }).catch(() => undefined);
    }, 300);
  };
  const unsubscribeQueries = queryClient.getQueryCache().subscribe(scheduleWrite);
  const unsubscribeMutations = queryClient.getMutationCache().subscribe(scheduleWrite);
  return () => {
    unsubscribeQueries();
    unsubscribeMutations();
    window.clearTimeout(timeout);
  };
}

export async function clearPersistedQueryCache() {
  if (!("indexedDB" in window)) return;
  try {
    const database = await openClientDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(QUERY_CACHE_STORE, "readwrite");
      transaction.objectStore(QUERY_CACHE_STORE).delete(CACHE_KEY);
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
    database.close();
  } catch {
    return;
  }
}
