export interface OpenAiAbortContext {
  signal: AbortSignal;
  timedOut: () => boolean;
  dispose: () => void;
}

export function createOpenAiAbortContext(
  externalSignal?: AbortSignal,
  timeoutMs = 90_000,
): OpenAiAbortContext {
  const controller = new AbortController();
  let timeoutTriggered = false;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) abortFromCaller();
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeout = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    timedOut: () => timeoutTriggered,
    dispose: () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
