export interface TaskProgressPatch {
  completed?: boolean;
  note?: string;
  customTask?: string;
  solution?: string;
}

export function buildTaskProgressUpdate(patch: TaskProgressPatch) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as TaskProgressPatch;
}
