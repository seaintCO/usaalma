"use client";

import { Mic, MicOff, PhoneOff, Radio, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type VoiceState =
  "idle" | "connecting" | "connected" | "muted" | "blocked" | "error";

function ephemeralSecret(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const session = root.session;
  if (!session || typeof session !== "object") return null;
  const record = session as Record<string, unknown>;
  if (typeof record.value === "string") return record.value;
  const clientSecret = record.client_secret;
  if (clientSecret && typeof clientSecret === "object") {
    const value = (clientSecret as Record<string, unknown>).value;
    if (typeof value === "string") return value;
  }
  return null;
}

export default function AlmaVoiceControls({
  language = "en",
  visualContext = "",
}: {
  language?: "en" | "es";
  visualContext?: string;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [message, setMessage] = useState("");
  const peer = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const localSessionId = useRef<string | null>(null);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContext = useRef("");

  const copy = useMemo(
    () =>
      language === "es"
        ? {
            start: "Hablar en vivo",
            mute: "Silenciar",
            unmute: "Activar",
            end: "Terminar",
            connected: "Voz en vivo conectada",
            disclosure:
              "Voz IA sintética. Las acciones externas requieren aprobación.",
            blocked:
              "La voz en tiempo real requiere el plan ALMA AI y configuración de OpenAI.",
            mic: "Permite el micrófono para hablar con ALMA.",
            connection: "La conexión de voz terminó. Inténtalo otra vez.",
          }
        : {
            start: "Talk live",
            mute: "Mute",
            unmute: "Unmute",
            end: "End",
            connected: "Live voice connected",
            disclosure:
              "Synthetic AI voice. External actions require approval.",
            blocked:
              "Realtime voice requires ALMA AI and OpenAI configuration.",
            mic: "Allow microphone access to talk with ALMA.",
            connection: "The voice connection ended. Try again.",
          },
    [language],
  );

  const settleSession = useCallback(() => {
    if (!localSessionId.current) return;
    const sessionId = localSessionId.current;
    localSessionId.current = null;
    void fetch("/api/realtime/session/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localSessionId: sessionId }),
      keepalive: true,
    });
  }, []);

  const cleanup = useCallback(
    (nextState: VoiceState = "idle") => {
      if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
      recoveryTimer.current = null;
      stream.current?.getTracks().forEach((track) => track.stop());
      peer.current?.close();
      remoteAudio.current?.remove();
      dataChannel.current = null;
      stream.current = null;
      peer.current = null;
      remoteAudio.current = null;
      settleSession();
      setState(nextState);
    },
    [settleSession],
  );

  const sendVisualContext = useCallback((context: string) => {
    const trimmed = context.trim();
    const channel = dataChannel.current;
    if (
      !trimmed ||
      trimmed === lastContext.current ||
      channel?.readyState !== "open"
    )
      return;
    channel.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Verified current camera observation: ${trimmed}. Use this only as visual context for the live conversation.`,
            },
          ],
        },
      }),
    );
    lastContext.current = trimmed;
  }, []);

  const start = useCallback(async () => {
    setState("connecting");
    setMessage("");
    lastContext.current = "";
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        setState("blocked");
        setMessage(copy.mic);
        return;
      }

      // Request microphone permission before reserving a metered voice session.
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const response = await fetch("/api/realtime/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ mode: "alma_voice", language }),
      });
      const payload = await response.json().catch(() => ({}));
      const secret = ephemeralSecret(payload);
      if (!response.ok || !payload.ok || !secret) {
        cleanup("blocked");
        setMessage(copy.blocked);
        return;
      }
      localSessionId.current =
        typeof payload.localSessionId === "string"
          ? payload.localSessionId
          : null;

      const connection = new RTCPeerConnection();
      peer.current = connection;
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      remoteAudio.current = audio;
      connection.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        void audio.play().catch(() => undefined);
      };
      stream.current
        .getTracks()
        .forEach((track) => connection.addTrack(track, stream.current!));

      const events = connection.createDataChannel("oai-events");
      dataChannel.current = events;
      events.onopen = () => sendVisualContext(visualContext);

      connection.onconnectionstatechange = () => {
        if (connection.connectionState === "connected") {
          if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
          recoveryTimer.current = null;
          setState("connected");
          setMessage(copy.connected);
        }
        if (["failed", "disconnected"].includes(connection.connectionState)) {
          if (recoveryTimer.current) return;
          recoveryTimer.current = setTimeout(() => {
            if (
              ["failed", "disconnected"].includes(connection.connectionState)
            ) {
              cleanup("error");
              setMessage(copy.connection);
            }
          }, 4_000);
        }
        if (connection.connectionState === "closed") cleanup("idle");
      };

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );
      if (!sdpResponse.ok) throw new Error("realtime_handshake_failed");
      await connection.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });
    } catch (error) {
      const permission =
        error instanceof DOMException &&
        ["NotAllowedError", "NotFoundError"].includes(error.name);
      cleanup(permission ? "blocked" : "error");
      setMessage(permission ? copy.mic : copy.connection);
    }
  }, [cleanup, copy, language, sendVisualContext, visualContext]);

  function toggleMute() {
    const nextMuted = state !== "muted";
    stream.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setState(nextMuted ? "muted" : "connected");
  }

  useEffect(() => {
    sendVisualContext(visualContext);
  }, [sendVisualContext, visualContext]);

  useEffect(() => {
    const endIfHidden = () => {
      if (document.hidden && peer.current) cleanup("idle");
    };
    document.addEventListener("visibilitychange", endIfHidden);
    window.addEventListener("pagehide", settleSession);
    return () => {
      document.removeEventListener("visibilitychange", endIfHidden);
      window.removeEventListener("pagehide", settleSession);
      cleanup("idle");
    };
  }, [cleanup, settleSession]);

  return (
    <div className="alma-glass-card rounded-2xl p-3 text-sm shadow-sm">
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
              onClick={() => cleanup("idle")}
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
            {language === "es" ? "Conectando…" : "Connecting…"}
          </span>
        ) : null}
      </div>
      {message ? (
        <p className="mt-2 text-xs text-[#6B7280]">{message}</p>
      ) : null}
    </div>
  );
}
