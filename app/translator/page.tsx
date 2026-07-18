"use client";

import { Languages, Mic, Pause, Play, RefreshCw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import BilingualComposer from "@/components/communications/BilingualComposer";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type Mode = "text" | "talk" | "conversation";
type RecorderState =
  | "idle"
  | "recording"
  | "processing"
  | "permission_denied"
  | "blocked"
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
    transcript: "Transcript",
    translation: "Translation",
    permission: "Microphone permission is required.",
    blocked: "Speech translation requires OpenAI audio configuration.",
    empty: "No speech captured yet.",
    replay: "Replay",
    slower: "Speak slower",
    disconnected: "Disconnected",
  },
  es: {
    title: "Traductor",
    subtitle: "Traduccion en ingles y espanol para texto y voz.",
    text: "Texto",
    talk: "Pulsar para hablar",
    conversation: "Conversacion",
    hold: "Grabar",
    stop: "Detener",
    transcript: "Transcripcion",
    translation: "Traduccion",
    permission: "Se requiere permiso del microfono.",
    blocked: "La traduccion de voz requiere configuracion de OpenAI.",
    empty: "Aun no hay audio capturado.",
    replay: "Repetir",
    slower: "Mas lento",
    disconnected: "Desconectado",
  },
} as const;

export default function TranslatorPage() {
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [mode, setMode] = useState<Mode>("text");
  const [state, setState] = useState<RecorderState>("idle");
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [side, setSide] = useState<"en" | "es">("en");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const copy = COPY[language];

  const loadLanguage = useCallback(async () => {
    const response = await fetch("/api/settings/language", {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = await response.json();
      setLanguage(payload.language === "es" ? "es" : "en");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void loadLanguage(), 0);
    return () => window.clearTimeout(id);
  }, [loadLanguage]);

  async function startRecording(
    targetLanguage: "en" | "es" = side === "en" ? "es" : "en",
  ) {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setState("blocked");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      recorder.current = new MediaRecorder(stream);
      recorder.current.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      recorder.current.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void transcribe(targetLanguage);
      };
      recorder.current.start();
      setState("recording");
    } catch {
      setState("permission_denied");
    }
  }

  async function stopRecording() {
    recorder.current?.stop();
    setState("processing");
  }

  async function transcribe(targetLanguage: "en" | "es") {
    try {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      if (!blob.size) {
        setState("error");
        return;
      }
      const form = new FormData();
      form.append("audio", blob, "speech.webm");
      form.append("targetLanguage", targetLanguage);
      const response = await fetch("/api/translator/transcribe", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setState(
          payload.error?.code === "openai_unconfigured" ? "blocked" : "error",
        );
        return;
      }
      setTranscript(payload.transcript ?? "");
      setTranslation(payload.translated?.translation ?? "");
      setState("idle");
      speak(payload.translated?.translation ?? "", targetLanguage);
    } catch {
      setState("error");
    }
  }

  async function speak(
    value = translation,
    targetLanguage = side === "en" ? "es" : "en",
  ) {
    if (!value) return;
    try {
      const response = await fetch("/api/translator/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (response.ok) {
        const audio = new Audio(URL.createObjectURL(await response.blob()));
        audio.playbackRate = targetLanguage === "es" ? 0.92 : 1;
        await audio.play();
        return;
      }
    } catch {
      // Browser speech synthesis below is the safe local fallback.
    }
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = targetLanguage === "es" ? "es-MX" : "en-US";
    utterance.rate = 0.86;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="apps"
      title={copy.title}
      onLanguageChange={setLanguage}
    >
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
          ) : (
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              {mode === "conversation" ? (
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#F7F7F8] p-1">
                  {(["en", "es"] as const).map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setSide(entry)}
                      className={`h-12 rounded-xl text-sm font-medium ${
                        side === entry ? "bg-black text-white" : "text-black"
                      }`}
                    >
                      {entry === "en" ? "English" : "Espanol"}
                    </button>
                  ))}
                </div>
              ) : null}

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
              </div>

              {state !== "idle" ? (
                <p className="mt-3 text-sm text-[#6B7280]">
                  {state === "permission_denied"
                    ? copy.permission
                    : state === "blocked"
                      ? copy.blocked
                      : state === "processing"
                        ? "Processing..."
                        : state === "recording"
                          ? "Recording..."
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
