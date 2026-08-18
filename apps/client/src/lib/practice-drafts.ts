import type {
  AiChatScope,
  AiLesson,
  PracticeSolutionProgress,
  PracticeSolutionSaveResult,
} from "../types";
import { openClientDatabase, PRACTICE_DRAFT_STORE } from "./client-database";

export interface LocalPracticeDraft {
  key: string;
  scope: AiChatScope;
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

export const buildPracticeDraftKey = (
  scope: AiChatScope,
  courseVersion: number,
  itemId: string,
  lessonVersion: number,
) => `${scope}:${courseVersion}:${itemId}:${lessonVersion}`;

const fromServer = (
  scope: AiChatScope,
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
      scope,
      lesson.courseVersion,
      lesson.itemId,
      lesson.version,
    ),
    scope,
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
  scope: AiChatScope,
  lesson: AiLesson,
  local: LocalPracticeDraft | undefined,
  progress?: PracticeSolutionProgress,
): ReconciledPracticeDraft {
  const serverDraft = fromServer(scope, lesson, progress);
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
  return runStoreRequest<LocalPracticeDraft | undefined>("readonly", (store) =>
    store.get(key),
  );
}

export async function writePracticeDraft(draft: LocalPracticeDraft) {
  if (!("indexedDB" in window)) return;
  await runStoreRequest<IDBValidKey>("readwrite", (store) =>
    store.put(draft, draft.key),
  );
}

export async function readDirtyPracticeDrafts() {
  if (!("indexedDB" in window)) return [];
  const drafts = await runStoreRequest<LocalPracticeDraft[]>("readonly", (store) =>
    store.getAll(),
  );
  return drafts.filter((draft) => draft.dirty);
}
