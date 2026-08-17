import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";

import { isOfflineMutationKey } from "./offline-mutation-keys";

const DATABASE_NAME = "frontend-sprint-cache";
const STORE_NAME = "query-cache";
const CACHE_KEY = "main";
const MAX_AGE = 7 * 24 * 60 * 60 * 1_000;

interface PersistedQueryCache {
  timestamp: number;
  state: DehydratedState;
}

export const isFreshQueryCache = (timestamp: number, now = Date.now()) =>
  now - timestamp <= MAX_AGE;

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

const readCache = async () => {
  const database = await openDatabase();
  return new Promise<PersistedQueryCache | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(CACHE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as PersistedQueryCache | undefined);
    transaction.oncomplete = () => database.close();
  });
};

const writeCache = async (cache: PersistedQueryCache) => {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(cache, CACHE_KEY);
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
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(CACHE_KEY);
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
    database.close();
  } catch {
    return;
  }
}
