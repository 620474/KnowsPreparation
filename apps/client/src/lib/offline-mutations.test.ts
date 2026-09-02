import {
  MutationObserver,
  QueryClient,
} from "@tanstack/query-core";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  updateTask: vi.fn().mockResolvedValue({ taskId: "task-1", completed: true }),
  updateQuestion: vi.fn(),
  reviewQuestion: vi.fn(),
  submitLessonQuiz: vi.fn(),
  submitPracticeAttempt: vi.fn().mockResolvedValue({ id: "attempt-1" }),
  updateMockAnswer: vi.fn(),
  updateSettings: vi.fn(),
  deleteAlgorithm: vi.fn(),
}));

vi.mock("../api", () => ({ learningApi: api }));

import { offlineMutationKeys } from "./offline-mutation-keys";
import type {
  PracticeAttemptMutationVariables,
  TaskMutationVariables,
} from "./offline-mutation-keys";
import { registerOfflineMutationDefaults } from "./offline-mutations";
import { mutationOutboxId } from "./mutation-outbox";

afterEach(() => {
  vi.clearAllMocks();
});

describe("offline mutations", () => {
  it("keeps an interview turn idempotent across offline replay", () => {
    expect(mutationOutboxId("interviewTurn", {
      interviewId: "interview-1",
      operationId: "operation-1",
    })).toBe("interviewTurn:operation-1");
  });

  it("executes a task update through the durable mutation transport", async () => {
    const queryClient = new QueryClient();
    registerOfflineMutationDefaults(queryClient);
    const observer = new MutationObserver<unknown, Error, TaskMutationVariables>(queryClient, {
      mutationKey: offlineMutationKeys.task,
    });
    await observer.mutate({ taskId: "task-1", progress: { completed: true } });

    expect(api.updateTask).toHaveBeenCalledTimes(1);
    expect(api.updateTask).toHaveBeenCalledWith("task-1", { completed: true });
    queryClient.clear();
  });

  it("preserves the operation id of a durable practice attempt", async () => {
    const queryClient = new QueryClient();
    registerOfflineMutationDefaults(queryClient);
    const observer = new MutationObserver<
      unknown,
      Error,
      PracticeAttemptMutationVariables
    >(queryClient, {
      mutationKey: offlineMutationKeys.practiceAttempt,
    });
    await observer.mutate({
      track: "yandex",
      itemId: "yandex-d01-algorithms",
      source: "task",
      solution: "function solve() {}",
      operationId: "attempt-operation-1",
    });

    expect(api.submitPracticeAttempt).toHaveBeenCalledWith(
      "yandex",
      "yandex-d01-algorithms",
      "task",
      undefined,
      "function solve() {}",
      "attempt-operation-1",
      undefined,
    );
    queryClient.clear();
  });
});
