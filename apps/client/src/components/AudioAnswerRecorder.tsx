import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "@mantine/core";
import { AlertTriangle, Mic, Square } from "lucide-react";

interface AudioAnswerRecorderProps {
  onTranscribe: (audio: Blob) => Promise<string | null>;
  onTranscript: (text: string) => void;
}

const MAX_RECORDING_MS = 5 * 60 * 1_000;

const pickMimeType = () =>
  ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  ) ?? "";

export function AudioAnswerRecorder({
  onTranscribe,
  onTranscript,
}: AudioAnswerRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const supported =
    typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  const clearTimers = () => {
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    if (elapsedTimerRef.current !== null) window.clearInterval(elapsedTimerRef.current);
    stopTimerRef.current = null;
    elapsedTimerRef.current = null;
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      releaseStream();
    };
  }, []);

  async function startRecording() {
    if (!supported) return;
    setError("");
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        clearTimers();
        releaseStream();
        if (mountedRef.current) {
          setRecording(false);
          setError("Запись прервалась. Проверь разрешение микрофона.");
        }
      };
      recorder.onstop = () => {
        clearTimers();
        releaseStream();
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (!mountedRef.current) return;
        setRecording(false);
        if (audio.size === 0) {
          setError("Запись получилась пустой. Попробуй ещё раз.");
          return;
        }
        setTranscribing(true);
        void onTranscribe(audio)
          .then((text) => {
            if (text && mountedRef.current) onTranscript(text);
          })
          .catch((transcriptionError) => {
            if (mountedRef.current) {
              setError(
                transcriptionError instanceof Error
                  ? transcriptionError.message
                  : "Не удалось распознать ответ",
              );
            }
          })
          .finally(() => {
            if (mountedRef.current) setTranscribing(false);
          });
      };
      recorder.start(1_000);
      setRecording(true);
      const startedAt = Date.now();
      elapsedTimerRef.current = window.setInterval(
        () => setElapsed(Math.floor((Date.now() - startedAt) / 1_000)),
        1_000,
      );
      stopTimerRef.current = window.setTimeout(() => recorder.stop(), MAX_RECORDING_MS);
    } catch (recordError) {
      releaseStream();
      setError(
        recordError instanceof Error
          ? recordError.message
          : "Не удалось получить доступ к микрофону",
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  if (!supported) {
    return <small className="voice-unavailable">Запись голоса не поддерживается этим браузером.</small>;
  }

  return (
    <div className="audio-answer-recorder">
      {recording ? (
        <Button className="secondary-button danger" type="button" variant="default" leftSection={<Square size={16} />} onClick={stopRecording}>
          Остановить · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </Button>
      ) : (
        <Button className="secondary-button" type="button" variant="default" leftSection={<Mic size={17} />} loading={transcribing} disabled={transcribing} onClick={() => void startRecording()}>
          {transcribing ? "Распознаю ответ…" : "Ответить голосом"}
        </Button>
      )}
      <small>До 5 минут. Аудио отправляется на распознавание и не сохраняется.</small>
      {error ? <Alert color="red" icon={<AlertTriangle size={16} />}>{error}</Alert> : null}
    </div>
  );
}
