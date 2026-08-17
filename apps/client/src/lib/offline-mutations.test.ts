import {
  dehydrate,
  hydrate,
  MutationObserver,
  onlineManager,
  QueryClient,
} from "@tanstack/query-core";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  updateTask: vi.fn().mockResolvedValue({ taskId: "task-1", completed: true }),
  updateQuestion: vi.fn(),
  reviewQuestion: vi.fn(),
  submitLessonQuiz: vi.fn(),
  updateMockAnswer: vi.fn(),
  updateSettings: vi.fn(),
  deleteAlgorithm: vi.fn(),
}));

vi.mock("../api", () => ({ learningApi: api }));

import { isOfflineMutationKey, offlineMutationKeys } from "./offline-mutation-keys";
import type { TaskMutationVariables } from "./offline-mutation-keys";
import { registerOfflineMutationDefaults } from "./offline-mutations";

afterEach(() => {
  onlineManager.setOnline(true);
  vi.clearAllMocks();
});

describe("offline mutations", () => {
  it("hydrates a paused task update and resumes it online", async () => {
    onlineManager.setOnline(false);
    const source = new QueryClient();
    registerOfflineMutationDefaults(source);
    const observer = new MutationObserver<unknown, Error, TaskMutationVariables>(source, {
      mutationKey: offlineMutationKeys.task,
    });
    void observer.mutate({ taskId: "task-1", progress: { completed: true } });
    await Promise.resolve();

    expect(api.updateTask).not.toHaveBeenCalled();
    const state = dehydrate(source, {
      shouldDehydrateMutation: (mutation) =>
        mutation.state.isPaused && isOfflineMutationKey(mutation.options.mutationKey),
    });
    expect(state.mutations).toHaveLength(1);

    const restored = new QueryClient();
    registerOfflineMutationDefaults(restored);
    hydrate(restored, state);
    onlineManager.setOnline(true);
    await restored.resumePausedMutations();

    expect(api.updateTask).toHaveBeenCalledTimes(1);
    expect(api.updateTask).toHaveBeenCalledWith("task-1", { completed: true });
    source.clear();
    restored.clear();
  });
});
