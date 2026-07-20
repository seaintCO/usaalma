"use client";

import { Mic, MicOff, PhoneOff, Radio, Volume2 } from "lucide-react";
import { useRef, useState } from "react";

type VoiceState =
  "idle" | "connecting" | "connected" | "muted" | "blocked" | "error";

export default function AlmaVoiceControls({
  language = "en",
}: {
  language?: "en" | "es";
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [message, setMessage] = useState("");
  const peer = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);

  const copy =
    language === "es"
      ? {
          start: "Hablar",
          mute: "Silenciar",
          unmute: "Activar",
          end: "Terminar",
          connected: "Voz conectada",
          disclosure:
            "Voz IA sintetica. Las acciones externas requieren aprobacion.",
          blocked: "La voz en tiempo real requiere configuracion de OpenAI.",
          mic: "Permite el microfono para hablar con ALMA.",
        }
      : {
          start: "Talk",
          mute: "Mute",
          unmute: "Unmute",
          end: "End",
          connected: "Voice connected",
          disclosure: "Synthetic AI voice. External actions require approval.",
          blocked: "Realtime voice requires OpenAI configuration.",
          mic: "Allow microphone access to talk with ALMA.",
        };

  async function start() {
    setState("connecting");
    setMessage("");
    try {
      const response = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "alma_voice", language }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setState("blocked");
        setMessage(copy.blocked);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        setState("blocked");
        setMessage(copy.mic);
        return;
      }
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      peer.current = new RTCPeerConnection();
      stream.current
        .getTracks()
        .forEach((track) => peer.current?.addTrack(track, stream.current!));
      setState("connected");
      setMessage(copy.connected);
    } catch {
      setState("error");
      setMessage(copy.mic);
      stop();
    }
  }

  function toggleMute() {
    const nextMuted = state !== "muted";
    stream.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = !nextMuted));
    setState(nextMuted ? "muted" : "connected");
  }

  function stop() {
    stream.current?.getTracks().forEach((track) => track.stop());
    peer.current?.close();
    stream.current = null;
    peer.current = null;
    setState("idle");
  }

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs text-[#6B7280]">
        <Radio className="h-4 w-4" />
        <span>{copy.disclosure}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {state === "idle" || state === "blocked" || state === "error" ? (
          <button
            type="button"
            onClick={() => void start()}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white"
          >
            <Mic className="h-4 w-4" />
            {copy.start}
          </button>
        ) : null}
        {state === "connected" || state === "muted" ? (
          <>
            <button
              type="button"
              onClick={toggleMute}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm font-medium"
            >
              {state === "muted" ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
              {state === "muted" ? copy.unmute : copy.mute}
            </button>
            <button
              type="button"
              onClick={stop}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm font-medium"
            >
              <PhoneOff className="h-4 w-4" />
              {copy.end}
            </button>
          </>
        ) : null}
        {state === "connecting" ? (
          <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm text-[#6B7280]">
            <Volume2 className="h-4 w-4 animate-pulse" />
            {state}
          </span>
        ) : null}
      </div>
      {message ? (
        <p className="mt-2 text-xs text-[#6B7280]">{message}</p>
      ) : null}
    </div>
  );
}
