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
});
