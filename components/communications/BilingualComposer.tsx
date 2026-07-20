"use client";

import {
  Check,
  Clipboard,
  Languages,
  Loader2,
  RefreshCw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  COMMUNICATION_LANGUAGES,
  COMMUNICATION_TONES,
  oppositeLanguage,
  type CommunicationLanguageCode,
  type CommunicationOperation,
  type CommunicationTone,
} from "@/lib/communications/languages";

type CommunicationResult = {
  originalText: string;
  original: string;
  detectedLanguage: CommunicationLanguageCode;
  correctedSource: string;
  corrected: string;
  translation: string;
  translated: string;
  sourceLanguage: CommunicationLanguageCode;
  targetLanguage: CommunicationLanguageCode;
  tone: CommunicationTone;
  warnings: string[];
  provider: "openai";
};

type ComposerCopy = {
  title: string;
  original: string;
  corrected: string;
  translation: string;
  source: string;
  target: string;
  tone: string;
  fix: string;
  translate: string;
  fixTranslate: string;
  listen: string;
  copy: string;
  use: string;
  preview: string;
  chars: string;
  retry: string;
  unavailable: string;
  speechUnavailable: string;
};

const COPY: Record<"en" | "es", ComposerCopy> = {
  en: {
    title: "Bilingual composer",
    original: "Original",
    corrected: "Corrected",
    translation: "Translation",
    source: "Source",
    target: "Target",
    tone: "Tone",
    fix: "Fix grammar",
    translate: "Translate",
    fixTranslate: "Fix and translate",
    listen: "Listen",
    copy: "Copy",
    use: "Use this version",
    preview: "Channel preview",
    chars: "characters",
    retry: "Retry",
    unavailable: "Translation is temporarily unavailable.",
    speechUnavailable: "Speech playback is temporarily unavailable.",
  },
  es: {
    title: "Compositor bilingue",
    original: "Original",
    corrected: "Corregido",
    translation: "Traduccion",
    source: "Origen",
    target: "Destino",
    tone: "Tono",
    fix: "Corregir",
    translate: "Traducir",
    fixTranslate: "Corregir y traducir",
    listen: "Escuchar",
    copy: "Copiar",
    use: "Usar esta version",
    preview: "Vista del canal",
    chars: "caracteres",
    retry: "Reintentar",
    unavailable: "La traduccion no esta disponible temporalmente.",
    speechUnavailable: "La reproduccion de voz no esta disponible.",
  },
};

function labelForTone(tone: CommunicationTone) {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

export default function BilingualComposer({
  channel = "chat",
  initialText = "",
  language = "en",
  onUse,
}: {
  channel?: "email" | "whatsapp" | "chat" | "office" | "translator";
  initialText?: string;
  language?: "en" | "es";
  onUse?: (value: string, result: CommunicationResult) => void;
}) {
  const copy = COPY[language];
  const [text, setText] = useState(initialText);
  const [sourceLanguage, setSourceLanguage] =
    useState<CommunicationLanguageCode>("en");
  const [targetLanguage, setTargetLanguage] =
    useState<CommunicationLanguageCode>("es");
  const [tone, setTone] = useState<CommunicationTone>("professional");
  const [result, setResult] = useState<CommunicationResult | null>(null);
  const [busy, setBusy] = useState<CommunicationOperation | null>(null);
  const [error, setError] = useState(false);
  const [speechError, setSpeechError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const preview = useMemo(
    () => result?.translation || result?.correctedSource || text,
    [result, text],
  );

  async function run(operation: CommunicationOperation) {
    if (!text.trim()) return;
    setBusy(operation);
    setError(false);
    try {
      const response = await fetch("/api/communications/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          text,
          sourceLanguage,
          targetLanguage,
          tone,
          channel,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        result?: CommunicationResult;
      };
      if (!response.ok || !payload.ok || !payload.result) {
        throw new Error("translation_failed");
      }
      setResult(payload.result);
      setSourceLanguage(payload.result.detectedLanguage);
      setTargetLanguage(payload.result.targetLanguage);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  async function listen() {
    if (!preview || typeof window === "undefined") return;
    setSpeechError(false);
    stopAudio();
    try {
      const response = await fetch("/api/translator/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: preview,
          voice: "alloy",
        }),
      });
      if (!response.ok) throw new Error("speech_failed");
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      audio.playbackRate =
        COMMUNICATION_LANGUAGES[targetLanguage].voiceLocale === "es-MX"
          ? 0.92
          : 1;
      audio.onended = stopAudio;
      audio.onerror = () => {
        stopAudio();
        setSpeechError(true);
      };
      audioRef.current = audio;
      audioUrlRef.current = url;
      await audio.play();
    } catch {
      stopAudio();
      setSpeechError(true);
    }
  }

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-black shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F7F8]">
          <Languages className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">{copy.title}</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#6B7280]">
            {copy.source}
          </span>
          <select
            value={sourceLanguage}
            onChange={(event) => {
              const next = event.target.value as CommunicationLanguageCode;
              setSourceLanguage(next);
              setTargetLanguage(oppositeLanguage(next));
            }}
            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-3 text-sm outline-none focus:border-black"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#6B7280]">
            {copy.target}
          </span>
          <select
            value={targetLanguage}
            onChange={(event) =>
              setTargetLanguage(event.target.value as CommunicationLanguageCode)
            }
            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-3 text-sm outline-none focus:border-black"
          >
            <option value="es">Spanish</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#6B7280]">
            {copy.tone}
          </span>
          <select
            value={tone}
            onChange={(event) =>
              setTone(event.target.value as CommunicationTone)
            }
            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-3 text-sm outline-none focus:border-black"
          >
            {COMMUNICATION_TONES.map((entry) => (
              <option key={entry} value={entry}>
                {labelForTone(entry)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-[#6B7280]">
          {copy.original}
        </span>
        <textarea
          value={text}
          rows={4}
          onChange={(event) => setText(event.target.value)}
          className="w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-3 py-3 text-sm leading-6 outline-none focus:border-black"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton
          label={copy.fix}
          busy={busy === "correct_grammar"}
          icon={Sparkles}
          onClick={() => void run("correct_grammar")}
        />
        <ActionButton
          label={copy.translate}
          busy={busy === "translate_text"}
          icon={Languages}
          onClick={() => void run("translate_text")}
        />
        <ActionButton
          label={copy.fixTranslate}
          busy={busy === "correct_and_translate"}
          icon={Check}
          primary
          onClick={() => void run("correct_and_translate")}
        />
        {error ? (
          <ActionButton
            label={copy.retry}
            icon={RefreshCw}
            onClick={() => void run("correct_and_translate")}
          />
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[#B45309]">{copy.unavailable}</p>
      ) : null}

      {speechError ? (
        <p className="mt-3 text-sm text-[#B45309]">{copy.speechUnavailable}</p>
      ) : null}

      {result ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <ResultPanel title={copy.corrected} value={result.correctedSource} />
          <ResultPanel title={copy.translation} value={result.translation} />
        </div>
      ) : null}

      <div className="mt-4 rounded-xl bg-[#F7F7F8] p-3">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[#6B7280]">
          <span>{copy.preview}</span>
          <span>
            {preview.length} {copy.chars}
          </span>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {preview || "-"}
        </p>
      </div>

      {result?.warnings.length ? (
        <ul className="mt-3 space-y-1 text-xs text-[#92400E]">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton
          label={copy.listen}
          icon={Volume2}
          onClick={() => void listen()}
        />
        <ActionButton
          label={copy.copy}
          icon={Clipboard}
          onClick={() => void navigator.clipboard?.writeText(preview)}
        />
        {result && onUse ? (
          <ActionButton
            label={copy.use}
            icon={Check}
            primary
            onClick={() => onUse(preview, result)}
          />
        ) : null}
      </div>
    </section>
  );
}

function ActionButton({
  busy,
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  busy?: boolean;
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium disabled:opacity-60 ${
        primary
          ? "bg-black text-white"
          : "border border-[#E5E7EB] bg-white text-black"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

function ResultPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#E5E7EB] p-3">
      <p className="mb-2 text-xs font-medium text-[#6B7280]">{title}</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-6">
        {value || "-"}
      </p>
    </div>
  );
}
