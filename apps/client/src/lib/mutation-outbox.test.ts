import { describe, expect, it } from "vitest";

import {
  mutationOutboxId,
  replayMutationEntries,
  runDurableMutation,
  type MutationOutboxEntry,
} from "./mutation-outbox";

describe("mutation outbox", () => {
  it("uses operation ids for append-only mutations", () => {
    expect(mutationOutboxId("quiz", { operationId: "operation-1" }))
      .toBe("quiz:operation-1");
  });

  it("coalesces idempotent entity updates", () => {
    expect(mutationOutboxId("task", { taskId: "task-1", progress: {} }))
      .toBe("task:task-1");
    expect(mutationOutboxId("mockAnswer", {
      interviewId: "mock-1",
      questionId: "question-2",
    })).toBe("mockAnswer:mock-1:question-2");
  });

  it("executes directly when IndexedDB is unavailable", async () => {
    await expect(runDurableMutation("settings", {}, async () => "saved"))
      .resolves.toBe("saved");
  });

  it("keeps failed entries retryable and acknowledges successful replay", async () => {
    const entry: MutationOutboxEntry = {
      id: "questionAttempt:operation-1",
      requestId: "request-1",
      kind: "questionAttempt",
      variables: { operationId: "operation-1" },
      createdAt: 1,
      attempts: 0,
      lastError: null,
    };
    const settled: Array<{ error?: unknown }> = [];
    const settle = async (_entry: MutationOutboxEntry, error?: unknown) => {
      settled.push({ error });
    };

    await expect(replayMutationEntries(
      [entry],
      async () => { throw new Error("offline"); },
      settle,
    )).resolves.toBe(0);
    await expect(replayMutationEntries([entry], async () => "ok", settle)).resolves.toBe(1);

    expect(settled).toHaveLength(2);
    expect(settled[0]?.error).toBeInstanceOf(Error);
    expect(settled[1]?.error).toBeUndefined();
  });
});
