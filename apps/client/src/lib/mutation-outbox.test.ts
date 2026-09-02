import { describe, expect, it } from "vitest";

import { mutationOutboxId, runDurableMutation } from "./mutation-outbox";

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
});
