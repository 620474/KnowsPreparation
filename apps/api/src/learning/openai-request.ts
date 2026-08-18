export interface OpenAiAbortContext {
  signal: AbortSignal;
  timedOut: () => boolean;
  keepAlive: () => void;
  dispose: () => void;
}

export function createOpenAiAbortContext(
  externalSignal?: AbortSignal,
  timeoutMs = 90_000,
): OpenAiAbortContext {
  const controller = new AbortController();
  let timeoutTriggered = false;
  let timeout: ReturnType<typeof setTimeout>;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) abortFromCaller();
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const arm = () => {
    timeout = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, timeoutMs);
  };

  arm();

  return {
    signal: controller.signal,
    timedOut: () => timeoutTriggered,
    // Полный урок не укладывается в один общий дедлайн, поэтому поток живёт,
    // пока OpenAI шлёт данные: считаем паузу молчания, а не всю длительность.
    keepAlive: () => {
      if (timeoutTriggered || controller.signal.aborted) return;
      clearTimeout(timeout);
      arm();
    },
    dispose: () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
