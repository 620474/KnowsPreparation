import { TRACK_KEYS } from "@prep/contracts";

import type {
  TrackKey,
  AiLesson,
  PracticeSolutionProgress,
  PracticeSolutionSaveResult,
} from "../types";
import { openClientDatabase, PRACTICE_DRAFT_STORE } from "./client-database";

export interface LocalPracticeDraft {
  key: string;
  track: TrackKey;
  courseVersion: number;
  itemId: string;
  lessonVersion: number;
  solution: string;
  revision: number;
  baseRevision: number;
  dirty: boolean;
  updatedAt: string;
  conflictSolution?: string;
  conflictUpdatedAt?: string;
}

export interface ReconciledPracticeDraft {
  draft: LocalPracticeDraft;
  shouldSync: boolean;
}

type StoredPracticeDraft = LocalPracticeDraft & { scope?: TrackKey };

export function migrateStoredPracticeDraft(value: unknown): LocalPracticeDraft | undefined {
  if (!value || typeof value !== "object") return undefined;
  const stored = value as Partial<StoredPracticeDraft>;
  const track = stored.track ?? stored.scope;
  if (!track || !(TRACK_KEYS as readonly string[]).includes(track)) {
    return undefined;
  }
  const migrated = { ...stored, track } as StoredPracticeDraft;
  delete migrated.scope;
  return migrated as LocalPracticeDraft;
}

export const buildPracticeDraftKey = (
  track: TrackKey,
  courseVersion: number,
  itemId: string,
  lessonVersion: number,
) => `${track}:${courseVersion}:${itemId}:${lessonVersion}`;

const fromServer = (
  track: TrackKey,
  lesson: AiLesson,
  progress?: PracticeSolutionProgress,
): LocalPracticeDraft => {
  const currentProgress =
    progress?.courseVersion === lesson.courseVersion &&
    progress.lessonVersion === lesson.version
      ? progress
      : undefined;
  return {
    key: buildPracticeDraftKey(
      track,
      lesson.courseVersion,
      lesson.itemId,
      lesson.version,
    ),
    track,
    courseVersion: lesson.courseVersion,
    itemId: lesson.itemId,
    lessonVersion: lesson.version,
    solution: currentProgress?.solution ?? lesson.practice.runner?.starterCode ?? "",
    revision: currentProgress?.revision ?? 0,
    baseRevision: currentProgress?.revision ?? 0,
    dirty: false,
    updatedAt: currentProgress?.updatedAt ?? new Date(0).toISOString(),
  };
};

export function reconcilePracticeDraft(
  track: TrackKey,
  lesson: AiLesson,
  local: LocalPracticeDraft | undefined,
  progress?: PracticeSolutionProgress,
): ReconciledPracticeDraft {
  const serverDraft = fromServer(track, lesson, progress);
  if (!local || local.key !== serverDraft.key) {
    return { draft: serverDraft, shouldSync: false };
  }
  if (local.dirty) {
    if (serverDraft.revision > local.baseRevision) {
      return {
        draft: {
          ...serverDraft,
          conflictSolution: local.solution,
          conflictUpdatedAt: local.updatedAt,
        },
        shouldSync: false,
      };
    }
    return { draft: local, shouldSync: true };
  }
  if (serverDraft.revision > local.revision) {
    return { draft: serverDraft, shouldSync: false };
  }
  if (local.revision > serverDraft.revision) {
    return {
      draft: { ...local, dirty: true, baseRevision: serverDraft.revision },
      shouldSync: true,
    };
  }
  return {
    draft: {
      ...serverDraft,
      conflictSolution: local.conflictSolution,
      conflictUpdatedAt: local.conflictUpdatedAt,
    },
    shouldSync: false,
  };
}

export const markPracticeDraftEdited = (
  draft: LocalPracticeDraft,
  solution: string,
): LocalPracticeDraft => ({
  ...draft,
  solution,
  baseRevision: draft.dirty ? draft.baseRevision : draft.revision,
  dirty: true,
  updatedAt: new Date().toISOString(),
});

export function applyPracticeSaveResult(
  draft: LocalPracticeDraft,
  result: PracticeSolutionSaveResult,
): LocalPracticeDraft {
  if (result.saved && result.progress) {
    return {
      ...draft,
      solution: result.progress.solution,
      revision: result.progress.revision,
      baseRevision: result.progress.revision,
      dirty: false,
      updatedAt: result.progress.updatedAt,
      conflictSolution: undefined,
      conflictUpdatedAt: undefined,
    };
  }
  if (result.progress) {
    return {
      ...draft,
      solution: result.progress.solution,
      revision: result.progress.revision,
      baseRevision: result.progress.revision,
      dirty: false,
      updatedAt: result.progress.updatedAt,
      conflictSolution: draft.solution,
      conflictUpdatedAt: draft.updatedAt,
    };
  }
  return draft;
}

export function reconcilePracticeSaveResult(
  current: LocalPracticeDraft,
  submitted: LocalPracticeDraft,
  result: PracticeSolutionSaveResult,
): ReconciledPracticeDraft {
  if (current.key !== submitted.key) {
    return { draft: current, shouldSync: false };
  }
  const changedAfterSubmit =
    current.updatedAt !== submitted.updatedAt ||
    current.solution !== submitted.solution;
  if (!changedAfterSubmit) {
    return {
      draft: applyPracticeSaveResult(submitted, result),
      shouldSync: false,
    };
  }
  if (result.saved && result.progress) {
    return {
      draft: {
        ...current,
        revision: result.progress.revision,
        baseRevision: result.progress.revision,
        dirty: true,
      },
      shouldSync: true,
    };
  }
  if (result.progress) {
    return {
      draft: {
        ...current,
        solution: result.progress.solution,
        revision: result.progress.revision,
        baseRevision: result.progress.revision,
        dirty: false,
        updatedAt: result.progress.updatedAt,
        conflictSolution: current.solution,
        conflictUpdatedAt: current.updatedAt,
      },
      shouldSync: false,
    };
  }
  return { draft: current, shouldSync: true };
}

const runStoreRequest = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const database = await openClientDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(PRACTICE_DRAFT_STORE, mode);
    const request = run(transaction.objectStore(PRACTICE_DRAFT_STORE));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
};

export async function readPracticeDraft(key: string) {
  if (!("indexedDB" in window)) return undefined;
  const stored = await runStoreRequest<unknown>("readonly", (store) => store.get(key));
  return migrateStoredPracticeDraft(stored);
}

export async function writePracticeDraft(draft: LocalPracticeDraft) {
  if (!("indexedDB" in window)) return;
  await runStoreRequest<IDBValidKey>("readwrite", (store) =>
    store.put(draft, draft.key),
  );
}

export async function readDirtyPracticeDrafts() {
  return (await readStoredPracticeDrafts()).filter((draft) => draft.dirty);
}

export async function readPendingPracticeDrafts() {
  return (await readStoredPracticeDrafts()).filter(
    (draft) => draft.dirty || draft.conflictSolution !== undefined,
  );
}

async function readStoredPracticeDrafts() {
  if (!("indexedDB" in window)) return [];
  const drafts = await runStoreRequest<unknown[]>("readonly", (store) =>
    store.getAll(),
  );
  return drafts
    .map(migrateStoredPracticeDraft)
    .filter((draft): draft is LocalPracticeDraft => Boolean(draft));
}

export async function restorePracticeDrafts(values: unknown[]) {
  let restored = 0;
  for (const value of values) {
    const draft = migrateStoredPracticeDraft(value);
    if (!draft || (!draft.dirty && draft.conflictSolution === undefined)) continue;
    const current = await readPracticeDraft(draft.key);
    if (
      current?.dirty &&
      new Date(current.updatedAt).getTime() > new Date(draft.updatedAt).getTime()
    ) {
      continue;
    }
    await writePracticeDraft(draft);
    restored += 1;
  }
  return restored;
}
