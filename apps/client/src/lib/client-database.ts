export const CLIENT_DATABASE_NAME = "frontend-sprint-cache";
export const CLIENT_DATABASE_VERSION = 4;
export const QUERY_CACHE_STORE = "query-cache";
export const PRACTICE_DRAFT_STORE = "practice-drafts";
export const MUTATION_OUTBOX_STORE = "mutation-outbox";
export const CHECKPOINT_DRAFT_STORE = "checkpoint-drafts";
export const INTERVIEW_DRAFT_STORE = "interview-drafts";

export const openClientDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(CLIENT_DATABASE_NAME, CLIENT_DATABASE_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const storeName of [
        QUERY_CACHE_STORE,
        PRACTICE_DRAFT_STORE,
        MUTATION_OUTBOX_STORE,
        CHECKPOINT_DRAFT_STORE,
        INTERVIEW_DRAFT_STORE,
      ]) {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
