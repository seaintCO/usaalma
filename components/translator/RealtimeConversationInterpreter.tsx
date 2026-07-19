"use client";

import {
  Clock,
  Languages,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { TranslationSpeaker } from "@/lib/voice/realtimeTranslation";
import { useRealtimeTranslationConversation } from "./useRealtimeTranslationConversation";

const SPEAKERS: TranslationSpeaker[] = ["english", "spanish"];

const COPY = {
  en: {
    title: "Live conversation",
    subtitle: "Two-person speech-to-speech interpretation over WebRTC.",
    standard: "Live interpretation is unavailable. Use Standard Push to Talk.",
    standardButton: "Use Standard Push to Talk",
    prepare: "Start live interpretation",
    connecting: "Preparing live sessions...",
    connected: "Connected",
    paused: "Paused",
    fallback: "Realtime unavailable",
    active: "Speaking",
    listen: "Hold to speak",
    stop: "Stop speaker",
    pause: "Pause",
    mute: "Mute audio",
    unmute: "Unmute audio",
    replay: "Replay latest",
    swap: "Swap sides",
    end: "End",
    clear: "Delete transcript",
    source: "Original",
    translated: "Translation",
    empty: "Transcript appears here while speaking.",
    history: "Conversation history",
    noHistory: "No completed turns yet.",
    quality: "Connection quality",
    save: "Transcript saving follows workspace memory preference.",
    disclosure: "AI voice is synthetic. Raw audio is not stored.",
  },
  es: {
    title: "Conversacion en vivo",
    subtitle: "Interpretacion de voz a voz por WebRTC.",
    standard:
      "La interpretacion en vivo no esta disponible. Usa traduccion estandar.",
    standardButton: "Usar traduccion estandar",
    prepare: "Iniciar interpretacion en vivo",
    connecting: "Preparando sesiones en vivo...",
    connected: "Conectado",
    paused: "Pausado",
    fallback: "Tiempo real no disponible",
    active: "Hablando",
    listen: "Mantener para hablar",
    stop: "Detener hablante",
    pause: "Pausar",
    mute: "Silenciar audio",
    unmute: "Activar audio",
    replay: "Repetir ultimo",
    swap: "Cambiar lados",
    end: "Terminar",
    clear: "Borrar transcripcion",
    source: "Original",
    translated: "Traduccion",
    empty: "La transcripcion aparece aqui al hablar.",
    history: "Historial",
    noHistory: "Aun no hay turnos completos.",
    quality: "Calidad de conexion",
    save: "El guardado sigue la preferencia de memoria del espacio.",
    disclosure: "La voz IA es sintetica. No se guarda audio sin procesar.",
  },
} as const;

export default function RealtimeConversationInterpreter({
  language = "en",
  onUseStandard,
}: {
  language?: "en" | "es";
  onUseStandard: () => void;
}) {
  const copy = COPY[language];
  const realtime = useRealtimeTranslationConversation();
  const quality =
    realtime.status === "connected"
      ? "Live"
      : realtime.status === "reconnecting"
        ? "Reconnecting"
        : realtime.status === "connecting"
          ? "Preparing"
          : "Idle";

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7F8]">
            <Languages className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
            {copy.subtitle}
          </p>
        </div>
        <div className="rounded-xl bg-[#F7F7F8] px-3 py-2 text-xs text-[#6B7280]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatElapsed(realtime.elapsedSeconds)}</span>
          </div>
          <p className="mt-1">
            {copy.quality}: {quality}
          </p>
        </div>
      </header>

      {realtime.status === "idle" || realtime.status === "ended" ? (
        <button
          type="button"
          onClick={() => void realtime.prepare()}
          className="mb-4 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-black px-5 text-sm font-medium text-white"
        >
          <Mic className="h-5 w-5" />
          {copy.prepare}
        </button>
      ) : null}

      {realtime.status === "connecting" ? (
        <p className="mb-4 rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
          {copy.connecting}
        </p>
      ) : null}

      {realtime.status === "fallback" || realtime.error ? (
        <div className="mb-4 rounded-xl border border-[#F59E0B]/30 bg-[#FFFBEB] p-3 text-sm text-[#92400E]">
          <p>{copy.standard}</p>
          <button
            type="button"
            onClick={onUseStandard}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white"
          >
            <RefreshCw className="h-4 w-4" />
            {copy.standardButton}
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {SPEAKERS.map((speaker) => (
          <SpeakerPanel
            key={speaker}
            speaker={speaker}
            language={language}
            active={realtime.activeSpeaker === speaker}
            source={realtime.sourceDrafts[speaker]}
            translation={realtime.translatedDrafts[speaker]}
            disabled={realtime.status !== "connected"}
            onStart={() => realtime.startSpeaker(speaker)}
            onStop={() => realtime.stopSpeaker(speaker)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ControlButton
          label={copy.pause}
          icon={Pause}
          onClick={realtime.pause}
          disabled={realtime.status !== "connected"}
        />
        <ControlButton
          label={realtime.muted ? copy.unmute : copy.mute}
          icon={realtime.muted ? VolumeX : Volume2}
          onClick={realtime.toggleMute}
          disabled={
            realtime.status !== "connected" && realtime.status !== "paused"
          }
        />
        <ControlButton
          label={copy.replay}
          icon={Play}
          onClick={realtime.replayLatest}
          disabled={!realtime.history.length}
        />
        <ControlButton
          label={copy.swap}
          icon={RotateCcw}
          onClick={realtime.swapSides}
        />
        <ControlButton
          label={copy.clear}
          icon={Trash2}
          onClick={realtime.clearTranscript}
          disabled={!realtime.history.length}
        />
        <ControlButton
          label={copy.end}
          icon={X}
          onClick={realtime.end}
          disabled={realtime.status === "idle" || realtime.status === "ended"}
        />
      </div>

      <div className="mt-4 grid gap-3 rounded-xl bg-[#F7F7F8] p-3 text-xs text-[#6B7280] md:grid-cols-2">
        <p>{copy.disclosure}</p>
        <p>{copy.save}</p>
        <p>Setup: {formatMs(realtime.metrics.connectionSetupMs)}</p>
        <p>
          First translated audio:{" "}
          {formatMs(realtime.metrics.firstTranslatedAudioMs)}
        </p>
      </div>

      <section className="mt-5">
        <h3 className="mb-3 text-sm font-semibold">{copy.history}</h3>
        {realtime.history.length ? (
          <div className="space-y-2">
            {realtime.history.map((turn) => (
              <div
                key={turn.id}
                className="rounded-xl border border-[#E5E7EB] p-3 text-sm"
              >
                <p className="text-xs font-medium text-[#6B7280]">
                  {turn.speaker === "english" ? "English" : "Spanish"}
                  {" -> "}
                  {turn.targetLanguage === "es" ? "Spanish" : "English"}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words">
                  {turn.sourceText || "-"}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-[#374151]">
                  {turn.translatedText || "-"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
            {copy.noHistory}
          </p>
        )}
      </section>
    </section>
  );
}

function SpeakerPanel({
  speaker,
  language,
  active,
  source,
  translation,
  disabled,
  onStart,
  onStop,
}: {
  speaker: TranslationSpeaker;
  language: "en" | "es";
  active: boolean;
  source: string;
  translation: string;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const copy = COPY[language];
  const title = speaker === "english" ? "English speaker" : "Spanish speaker";
  const target = speaker === "english" ? "Spanish" : "English";
  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 ${
        active ? "border-black bg-[#F7F7F8]" : "border-[#E5E7EB] bg-white"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{title}</p>
          <p className="text-xs text-[#6B7280]">Output: {target}</p>
        </div>
        {active ? (
          <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
            {copy.active}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={onStart}
        onMouseUp={onStop}
        onMouseLeave={onStop}
        onTouchStart={onStart}
        onTouchEnd={onStop}
        className="mb-4 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-black px-5 text-base font-medium text-white disabled:bg-[#9CA3AF]"
      >
        {active ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        {active ? copy.stop : copy.listen}
      </button>
      <TranscriptBlock title={copy.source} value={source || copy.empty} />
      <TranscriptBlock
        title={copy.translated}
        value={translation || copy.empty}
      />
    </div>
  );
}

function TranscriptBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="mb-3 min-w-0 rounded-xl bg-white p-3">
      <p className="mb-2 text-xs font-medium text-[#6B7280]">{title}</p>
      <p className="min-h-12 whitespace-pre-wrap break-words text-sm leading-6">
        {value}
      </p>
    </div>
  );
}

function ControlButton({
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: typeof Pause;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm font-medium disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function formatMs(value: number | null) {
  return value === null ? "pending" : `${value} ms`;
}
