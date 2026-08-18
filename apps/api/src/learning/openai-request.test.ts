import { afterEach, describe, expect, it, vi } from "vitest";

import { createOpenAiAbortContext } from "./openai-request";

describe("createOpenAiAbortContext", () => {
  afterEach(() => vi.useRealTimers());

  it("aborts when the caller disconnects", () => {
    const caller = new AbortController();
    const context = createOpenAiAbortContext(caller.signal);

    caller.abort();

    expect(context.signal.aborted).toBe(true);
    expect(context.timedOut()).toBe(false);
    context.dispose();
  });

  it("distinguishes a request timeout", () => {
    vi.useFakeTimers();
    const context = createOpenAiAbortContext(undefined, 1_000);

    vi.advanceTimersByTime(1_000);

    expect(context.signal.aborted).toBe(true);
    expect(context.timedOut()).toBe(true);
    context.dispose();
  });

  it("keeps a streaming response alive while data keeps arriving", () => {
    vi.useFakeTimers();
    const context = createOpenAiAbortContext(undefined, 1_000);

    for (let chunk = 0; chunk < 5; chunk += 1) {
      vi.advanceTimersByTime(900);
      context.keepAlive();
    }

    expect(context.signal.aborted).toBe(false);
    expect(context.timedOut()).toBe(false);
    context.dispose();
  });

  it("times out once the stream goes silent", () => {
    vi.useFakeTimers();
    const context = createOpenAiAbortContext(undefined, 1_000);

    vi.advanceTimersByTime(900);
    context.keepAlive();
    vi.advanceTimersByTime(1_000);

    expect(context.signal.aborted).toBe(true);
    expect(context.timedOut()).toBe(true);
    context.dispose();
  });
});
