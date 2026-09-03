import {
  CHECKPOINT_DRAFT_STORE,
  INTERVIEW_DRAFT_STORE,
  openClientDatabase,
} from "./client-database";

export interface CheckpointDraft {
  sessionId: string;
  leaseId: string;
  answer: string;
  explanation: string;
  selectedOption: number | null;
  confidenceBefore: number;
  confidenceAfter: number;
  answerLocked: boolean;
  operationId: string | null;
  startedAt: number;
  updatedAt: string;
}

export interface InterviewDraft {
  interviewId: string;
  platformDrafts: Record<string, { answer: string; followUpAnswer: string; secondFollowUpAnswer: string }>;
  codingSolution: string;
  aiSolution: string;
  aiMessage: string;
  defenseDrafts: Record<number, string>;
  directorDraft: string;
  updatedAt: string;
}

const runStoreRequest = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  if (!("indexedDB" in window)) return undefined;
  const database = await openClientDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = run(transaction.objectStore(storeName));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
};

const read = <T>(storeName: string, key: string) =>
  runStoreRequest<unknown>(storeName, "readonly", (store) => store.get(key))
    .then((value) => value && typeof value === "object" ? value as T : undefined);

const write = (storeName: string, key: string, value: unknown) =>
  runStoreRequest<IDBValidKey>(storeName, "readwrite", (store) => store.put(value, key));

const remove = (storeName: string, key: string) =>
  runStoreRequest<undefined>(storeName, "readwrite", (store) => store.delete(key));

export async function readCheckpointDraft(leaseId: string) {
  const draft = await read<CheckpointDraft>(CHECKPOINT_DRAFT_STORE, leaseId);
  if (draft) return draft;
  const legacyKey = `checkpoint-draft:${leaseId}`;
  const legacy = localStorage.getItem(legacyKey);
  if (!legacy) return undefined;
  try {
    const parsed = JSON.parse(legacy) as CheckpointDraft;
    const migrated = { ...parsed, updatedAt: parsed.updatedAt ?? new Date().toISOString() };
    await writeCheckpointDraft(migrated);
    localStorage.removeItem(legacyKey);
    return migrated;
  } catch {
    localStorage.removeItem(legacyKey);
    return undefined;
  }
}

export const writeCheckpointDraft = (draft: CheckpointDraft) =>
  write(CHECKPOINT_DRAFT_STORE, draft.leaseId, draft);
export const deleteCheckpointDraft = (leaseId: string) =>
  remove(CHECKPOINT_DRAFT_STORE, leaseId);

export const readInterviewDraft = (interviewId: string) =>
  read<InterviewDraft>(INTERVIEW_DRAFT_STORE, interviewId);
export const writeInterviewDraft = (draft: InterviewDraft) =>
  write(INTERVIEW_DRAFT_STORE, draft.interviewId, draft);
export const deleteInterviewDraft = (interviewId: string) =>
  remove(INTERVIEW_DRAFT_STORE, interviewId);
