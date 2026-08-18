import { EventEmitter } from "node:events";

import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { LearningController } from "./learning.controller";
import type { LearningBackupService } from "./learning-backup.service";
import type { LearningBootstrapService } from "./learning-bootstrap.service";
import type { LearningService } from "./learning.service";

type StreamResponse = (
  response: Response,
  run: (
    onDelta: (delta: string) => void,
    signal: AbortSignal,
  ) => Promise<unknown>,
) => Promise<void>;

function createResponseMock() {
  const response = Object.assign(new EventEmitter(), {
    destroyed: false,
    writableEnded: false,
    req: { originalUrl: "/api/learning/test/stream" },
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  });
  return response as unknown as Response;
}

describe("LearningController SSE", () => {
  it("aborts the running operation when the client disconnects", async () => {
    const controller = new LearningController(
      {} as LearningService,
      {} as LearningBootstrapService,
      {} as LearningBackupService,
    );
    const streamResponse = Reflect.get(controller, "streamResponse") as StreamResponse;
    const response = createResponseMock();
    let receivedSignal: AbortSignal | undefined;

    const running = streamResponse.call(controller, response, (_onDelta, signal) => {
      receivedSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Client disconnected", "AbortError")),
          { once: true },
        );
      });
    });

    await Promise.resolve();
    Object.assign(response, { destroyed: true });
    (response as unknown as EventEmitter).emit("close");
    await running;

    expect(receivedSignal?.aborted).toBe(true);
    expect(response.write).not.toHaveBeenCalled();
    expect(response.end).not.toHaveBeenCalled();
  });
});
