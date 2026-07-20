"use client";

import {
  Clipboard,
  Languages,
  Mic,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import BilingualComposer from "@/components/communications/BilingualComposer";
import RealtimeConversationInterpreter from "@/components/translator/RealtimeConversationInterpreter";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type Mode = "text" | "talk" | "conversation";
type RecorderState =
  | "idle"
  | "recording"
  | "processing"
  | "transcribing"
  | "translating"
  | "speaking"
  | "complete"
  | "permission_denied"
  | "blocked"
  | "unsupported_browser"
  | "invalid_recording"
  | "usage_limit"
  | "provider_unavailable"
  | "error";

const COPY = {
  en: {
    title: "Translator",
    subtitle: "English and Spanish translation for text and speech.",
    text: "Text",
    talk: "Push to Talk",
    conversation: "Conversation",
    hold: "Record",
    stop: "Stop",
    swap: "Swap languages",
    copy: "Copy",
    transcript: "Transcript",
    translation: "Translation",
    permission: "Microphone permission is required.",
    blocked: "Speech translation requires OpenAI audio configuration.",
    unsupportedBrowser:
      "This browser cannot create a supported audio recording.",
    invalidRecording: "This recording format is not supported.",
    usageLimit: "Usage limit reached. Try again shortly.",
    providerUnavailable: "Speech provider is temporarily unavailable.",
    empty: "No speech captured yet.",
    replay: "Replay",
    slower: "Speak slower",
    disconnected: "Disconnected",
    standard: "Standard translation",
  },
  es: {
    title: "Traductor",
    subtitle: "Traduccion en ingles y espanol para texto y voz.",
    text: "Texto",
    talk: "Pulsar para hablar",
    conversation: "Conversacion",
    hold: "Grabar",
    stop: "Detener",
    swap: "Cambiar idiomas",
    copy: "Copiar",
    transcript: "Transcripcion",
    translation: "Traduccion",
    permission: "Se requiere permiso del microfono.",
    blocked: "La traduccion de voz requiere configuracion de OpenAI.",
    unsupportedBrowser:
      "Este navegador no puede crear una grabacion de audio compatible.",
    invalidRecording: "Este formato de grabacion no es compatible.",
    usageLimit: "Limite de uso alcanzado. Intenta de nuevo en breve.",
    providerUnavailable: "El proveedor de voz no esta disponible.",
    empty: "Aun no hay audio capturado.",
    replay: "Repetir",
    slower: "Mas lento",
    disconnected: "Desconectado",
    standard: "Traduccion estandar",
  },
} as const;

export default function TranslatorPage() {
  const { locale: language } = useAlmaLocale();
  const [mode, setMode] = useState<Mode>("text");
  const [state, setState] = useState<RecorderState>("idle");
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [side, setSide] = useState<"en" | "es">("en");
  const recorder = useRef<MediaRecorder | null>(null);
  const recorderStream = useRef<MediaStream | null>(null);
  const activeTargetLanguage = useRef<"en" | "es">("es");
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const cachedSpeech = useRef<{
    text: string;
    targetLanguage: "en" | "es";
    url: string;
  } | null>(null);
  const copy = COPY[language];

  const stopMicrophoneTracks = useCallback(() => {
    recorderStream.current?.getTracks().forEach((track) => track.stop());
    recorderStream.current = null;
  }, []);

  const stopAudio = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current && audioUrl.current !== cachedSpeech.current?.url) {
      URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = null;
    }
  }, []);

  const clearCachedSpeech = useCallback(() => {
    if (cachedSpeech.current?.url) {
      URL.revokeObjectURL(cachedSpeech.current.url);
    }
    cachedSpeech.current = null;
    audioUrl.current = null;
  }, []);

  const cancelRecording = useCallback(() => {
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = () => stopMicrophoneTracks();
      recorder.current.stop();
    } else {
      stopMicrophoneTracks();
    }
    chunks.current = [];
    recorder.current = null;
  }, [stopMicrophoneTracks]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        cancelRecording();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelRecording();
      stopAudio();
    };
  }, [cancelRecording, stopAudio]);

  async function startRecording(
    targetLanguage: "en" | "es" = side === "en" ? "es" : "en",
  ) {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setState("blocked");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      clearCachedSpeech();
      recorderStream.current = stream;
      activeTargetLanguage.current = targetLanguage;
      chunks.current = [];
      const mimeType = selectRecorderMimeType();
      const nextRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const actualMimeType = normalizedBrowserAudioMimeType(
        nextRecorder.mimeType || mimeType,
      );
      if (!actualMimeType) {
        stream.getTracks().forEach((track) => track.stop());
        recorderStream.current = null;
        setState("unsupported_browser");
        return;
      }
      recorder.current = nextRecorder;
      recorder.current.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      recorder.current.onstop = () => {
        stopMicrophoneTracks();
        void transcribe(activeTargetLanguage.current);
      };
      recorder.current.start();
      setState("recording");
    } catch {
      stopMicrophoneTracks();
      setState("permission_denied");
    }
  }

  async function stopRecording() {
    recorder.current?.stop();
    setState("transcribing");
  }

  async function transcribe(targetLanguage: "en" | "es") {
    try {
      const mimeType =
        chunks.current.find((chunk) => chunk.type)?.type ||
        recorder.current?.mimeType ||
        "audio/webm";
      const blob = new Blob(chunks.current, { type: mimeType });
      recorder.current = null;
      if (!blob.size) {
        setState("error");
        return;
      }
      const form = new FormData();
      const fileName = fileNameForBrowserAudio(blob.type);
      if (!fileName) {
        setState("unsupported_browser");
        return;
      }
      form.append("audio", blob, fileName);
      form.append("targetLanguage", targetLanguage);
      const response = await fetch("/api/translator/transcribe", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setState(stateForError(payload.error?.code, response.status));
        return;
      }
      setTranscript(payload.transcript ?? "");
      setTranslation(payload.translated?.translation ?? "");
      setState("speaking");
      await speak(payload.translated?.translation ?? "", targetLanguage);
      setState("complete");
    } catch {
      stopMicrophoneTracks();
      setState("error");
    }
  }

  async function speak(
    value = translation,
    targetLanguage: "en" | "es" = side === "en" ? "es" : "en",
  ) {
    if (!value) return;
    stopAudio();
    try {
      const cached = cachedSpeech.current;
      if (
        cached &&
        cached.text === value &&
        cached.targetLanguage === targetLanguage
      ) {
        const player = new Audio(cached.url);
        player.playbackRate = targetLanguage === "es" ? 0.92 : 1;
        audio.current = player;
        await player.play();
        return;
      }
      const response = await fetch("/api/translator/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setState(stateForError(payload.error?.code, response.status));
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const player = new Audio(url);
      player.playbackRate = targetLanguage === "es" ? 0.92 : 1;
      player.onended = stopAudio;
      player.onerror = () => {
        stopAudio();
        setState("provider_unavailable");
      };
      audio.current = player;
      audioUrl.current = url;
      cachedSpeech.current = { text: value, targetLanguage, url };
      await player.play();
      return;
    } catch {
      stopAudio();
      setState("provider_unavailable");
    }
  }

  return (
    <AlmaShell language={language} activeWorkspace="apps" title={copy.title}>
      <div className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <Languages className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280] md:text-base">
              {copy.subtitle}
            </p>
          </header>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {(["text", "talk", "conversation"] as Mode[]).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setMode(entry)}
                className={`h-10 shrink-0 rounded-xl border px-3 text-sm font-medium ${
                  mode === entry
                    ? "border-black bg-black text-white"
                    : "border-[#E5E7EB] bg-white text-black"
                }`}
              >
                {copy[entry]}
              </button>
            ))}
          </div>

          {mode === "text" ? (
            <BilingualComposer channel="translator" language={language} />
          ) : mode === "conversation" ? (
            <RealtimeConversationInterpreter
              language={language}
              onUseStandard={() => setMode("talk")}
            />
          ) : (
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-[#F7F7F8] px-3 py-1 text-xs font-medium text-[#6B7280]">
                  {copy.standard}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSide((current) => (current === "en" ? "es" : "en"))
                  }
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm font-medium"
                >
                  <RotateCcw className="h-4 w-4" />
                  {copy.swap}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {state === "recording" ? (
                  <button
                    type="button"
                    onClick={() => void stopRecording()}
                    className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-black px-5 text-base font-medium text-white"
                  >
                    <Pause className="h-5 w-5" />
                    {copy.stop}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-black px-5 text-base font-medium text-white"
                  >
                    <Mic className="h-5 w-5" />
                    {copy.hold}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void speak()}
                  className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-[#E5E7EB] px-5 text-base font-medium"
                >
                  <Volume2 className="h-5 w-5" />
                  {copy.replay}
                </button>
                <button
                  type="button"
                  onClick={() => void speak(translation)}
                  className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-[#E5E7EB] px-5 text-base font-medium"
                >
                  <Play className="h-5 w-5" />
                  {copy.slower}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard?.writeText(translation)
                  }
                  className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-[#E5E7EB] px-5 text-base font-medium"
                >
                  <Clipboard className="h-5 w-5" />
                  {copy.copy}
                </button>
              </div>

              {state !== "idle" ? (
                <p className="mt-3 text-sm text-[#6B7280]">
                  {state === "permission_denied"
                    ? copy.permission
                    : state === "blocked"
                      ? copy.blocked
                      : state === "unsupported_browser"
                        ? copy.unsupportedBrowser
                        : state === "invalid_recording"
                          ? copy.invalidRecording
                          : state === "usage_limit"
                            ? copy.usageLimit
                            : state === "provider_unavailable"
                              ? copy.providerUnavailable
                              : state === "transcribing"
                                ? "Transcribing..."
                                : state === "translating"
                                  ? "Translating..."
                                  : state === "speaking"
                                    ? "Speaking..."
                                    : state === "complete"
                                      ? "Complete"
                                      : state === "processing"
                                        ? "Processing..."
                                        : state === "recording"
                                          ? "Listening..."
                                          : copy.disconnected}
                </p>
              ) : null}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <TranscriptCard
                  title={copy.transcript}
                  value={transcript || copy.empty}
                />
                <TranscriptCard
                  title={copy.translation}
                  value={translation || copy.empty}
                />
              </div>
              {state === "error" ? (
                <button
                  type="button"
                  onClick={() => setState("idle")}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </AlmaShell>
  );
}

function TranscriptCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#F7F7F8] p-4">
      <p className="mb-2 text-xs font-medium text-[#6B7280]">{title}</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-6">
        {value}
      </p>
    </div>
  );
}

function stateForError(
  code: unknown,
  status: number,
): Exclude<RecorderState, "idle" | "recording" | "processing"> {
  if (
    code === "openai_api_key_missing" ||
    code === "invalid_transcription_model" ||
    code === "invalid_speech_model" ||
    code === "audio_configuration_failed"
  ) {
    return "blocked";
  }
  if (
    code === "unsupported_audio_type" ||
    code === "audio_too_large" ||
    code === "empty_audio" ||
    status === 413 ||
    status === 415
  ) {
    return "invalid_recording";
  }
  if (code === "rate_limited" || status === 429) {
    return "usage_limit";
  }
  if (status >= 500) {
    return "provider_unavailable";
  }
  return "error";
}

function selectRecorderMimeType() {
  const preferred = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
  ];
  return preferred.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function normalizedBrowserAudioMimeType(value: string) {
  const normalized = value.toLowerCase().trim().split(";")[0]?.trim();
  return normalized === "audio/webm" ||
    normalized === "video/webm" ||
    normalized === "audio/mp4"
    ? normalized
    : "";
}

function fileNameForBrowserAudio(value: string) {
  const normalized = normalizedBrowserAudioMimeType(value);
  if (normalized === "audio/webm" || normalized === "video/webm") {
    return "recording.webm";
  }
  if (normalized === "audio/mp4") {
    return "recording.mp4";
  }
  return "";
}
