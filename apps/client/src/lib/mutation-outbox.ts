import { createOperationId } from "./offline-mutation-keys";
import { MUTATION_OUTBOX_STORE, openClientDatabase } from "./client-database";

export const MUTATION_OUTBOX_CHANGED_EVENT = "frontend-sprint:outbox-changed";

export type DurableMutationKind =
  | "task"
  | "question"
  | "review"
  | "questionAttempt"
  | "quiz"
  | "practiceAttempt"
  | "mockAnswer"
  | "settings"
  | "deleteAlgorithm"
  | "skipRecommendation"
  | "missionAction"
  | "transferAssessment";

export interface MutationOutboxEntry {
  id: string;
  requestId: string;
  kind: DurableMutationKind;
  variables: unknown;
  createdAt: number;
  attempts: number;
  lastError: string | null;
}

const supportsOutbox = () =>
  typeof window !== "undefined" && "indexedDB" in window;

const variableRecord = (variables: unknown) =>
  variables && typeof variables === "object" && !Array.isArray(variables)
    ? variables as Record<string, unknown>
    : {};

export const mutationOutboxId = (kind: DurableMutationKind, variables: unknown) => {
  const record = variableRecord(variables);
  if (typeof record.operationId === "string") return `${kind}:${record.operationId}`;
  if (kind === "task") return `${kind}:${String(record.taskId)}`;
  if (kind === "question") return `${kind}:${String(record.questionId)}`;
  if (kind === "mockAnswer") {
    return `${kind}:${String(record.interviewId)}:${String(record.questionId)}`;
  }
  if (kind === "settings") return kind;
  if (kind === "deleteAlgorithm") return `${kind}:${String(variables)}`;
  return `${kind}:${createOperationId()}`;
};

const notifyOutboxChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MUTATION_OUTBOX_CHANGED_EVENT));
};

const transact = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, setResult: (value: T) => void, reject: (reason?: unknown) => void) => void,
) => {
  const database = await openClientDatabase();
  return new Promise<T>((resolve, reject) => {
    let result: T;
    const transaction = database.transaction(MUTATION_OUTBOX_STORE, mode);
    operation(transaction.objectStore(MUTATION_OUTBOX_STORE), (value) => {
      result = value;
    }, reject);
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
  });
};

export async function listMutationOutbox() {
  if (!supportsOutbox()) return [];
  const entries = await transact<MutationOutboxEntry[]>("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as MutationOutboxEntry[]);
  });
  return entries.sort((left, right) => left.createdAt - right.createdAt);
}

export async function getMutationOutboxCount() {
  if (!supportsOutbox()) return 0;
  return transact<number>("readonly", (store, resolve, reject) => {
    const request = store.count();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function putMutationOutbox(entry: MutationOutboxEntry) {
  if (!supportsOutbox()) return;
  await transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(entry, entry.id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  notifyOutboxChanged();
}

async function settleMutationOutbox(
  entry: MutationOutboxEntry,
  error?: unknown,
) {
  if (!supportsOutbox()) return;
  await transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.get(entry.id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const current = request.result as MutationOutboxEntry | undefined;
      if (current?.requestId !== entry.requestId) {
        resolve();
        return;
      }
      if (error === undefined) {
        store.delete(entry.id);
      } else {
        store.put({
          ...entry,
          attempts: entry.attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
        }, entry.id);
      }
      resolve();
    };
  });
  notifyOutboxChanged();
}

export async function runDurableMutation<T>(
  kind: DurableMutationKind,
  variables: unknown,
  execute: () => Promise<T>,
) {
  if (!supportsOutbox()) return execute();
  const id = mutationOutboxId(kind, variables);
  const entry: MutationOutboxEntry = {
    id,
    requestId: createOperationId(),
    kind,
    variables,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
  };
  await putMutationOutbox(entry);
  try {
    const result = await execute();
    await settleMutationOutbox(entry);
    return result;
  } catch (error) {
    await settleMutationOutbox(entry, error);
    throw error;
  }
}

export async function replayMutationOutbox(
  execute: (entry: MutationOutboxEntry) => Promise<unknown>,
) {
  const entries = await listMutationOutbox();
  return replayMutationEntries(entries, execute, settleMutationOutbox);
}

export async function replayMutationEntries(
  entries: MutationOutboxEntry[],
  execute: (entry: MutationOutboxEntry) => Promise<unknown>,
  settle: (entry: MutationOutboxEntry, error?: unknown) => Promise<void>,
) {
  let completed = 0;
  for (const entry of entries) {
    try {
      await execute(entry);
      await settle(entry);
      completed += 1;
    } catch (error) {
      await settle(entry, error);
    }
  }
  return completed;
}
