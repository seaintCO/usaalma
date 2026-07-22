"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendTranscriptDelta,
  directionForSpeaker,
  oppositeSpeaker,
  TRANSLATION_DIRECTION_LIST,
  type TranslationDirection,
  type TranslationDirectionKey,
  type TranslationSpeaker,
} from "@/lib/voice/realtimeTranslation";

export type RealtimeConversationStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "paused"
  | "ended"
  | "fallback"
  | "error";

export type RealtimeConversationError =
  | "microphone_denied"
  | "realtime_model_unavailable"
  | "client_secret_failed"
  | "webrtc_connection_failed"
  | "autoplay_blocked"
  | "network_interrupted"
  | "session_expired"
  | "quota_exhausted"
  | "unsupported_browser"
  | "translation_delayed"
  | "user_cancelled";

export type ConversationTurn = {
  id: string;
  speaker: TranslationSpeaker;
  sourceLanguage: "en" | "es";
  targetLanguage: "en" | "es";
  sourceText: string;
  translatedText: string;
  createdAt: number;
};

export type RealtimeMetrics = {
  connectionSetupMs: number | null;
  firstSourceTranscriptMs: number | null;
  firstTranslatedTranscriptMs: number | null;
  firstTranslatedAudioMs: number | null;
  endOfUtteranceLatencyMs: number | null;
  reconnectCount: number;
};

type SessionRuntime = {
  direction: TranslationDirection;
  peer: RTCPeerConnection;
  channel: RTCDataChannel;
  stream: MediaStream;
  audio: HTMLAudioElement;
  startedAt: number;
  localSessionId: string | null;
  stale: boolean;
};

const EMPTY_METRICS: RealtimeMetrics = {
  connectionSetupMs: null,
  firstSourceTranscriptMs: null,
  firstTranslatedTranscriptMs: null,
  firstTranslatedAudioMs: null,
  endOfUtteranceLatencyMs: null,
  reconnectCount: 0,
};

function classifySecretError(code: unknown): RealtimeConversationError {
  if (code === "rate_limited") return "quota_exhausted";
  if (
    code === "invalid_realtime_model" ||
    code === "openai_api_key_missing" ||
    code === "audio_configuration_failed"
  ) {
    return "realtime_model_unavailable";
  }
  if (code === "unauthorized") return "session_expired";
  return "client_secret_failed";
}

function extractClientSecret(payload: Record<string, unknown>) {
  return typeof payload.clientSecret === "string" ? payload.clientSecret : null;
}

function extractEventText(event: Record<string, unknown>) {
  for (const key of ["delta", "text", "transcript"]) {
    if (typeof event[key] === "string") return event[key] as string;
  }
  return "";
}

function isSourceTranscriptEvent(type: string) {
  return (
    type.includes("input") &&
    type.includes("transcript") &&
    type.includes("delta")
  );
}

function isTranslatedTranscriptEvent(type: string) {
  return (
    type.includes("translation") ||
    (type.includes("output") && type.includes("transcript")) ||
    type.includes("audio_transcript")
  );
}

function isFinalTurnEvent(type: string) {
  return (
    type.includes("transcript.done") ||
    type.includes("translation.done") ||
    type.includes("response.done") ||
    type.includes("conversation.item.completed")
  );
}

export function useRealtimeTranslationConversation() {
  const [status, setStatus] = useState<RealtimeConversationStatus>("idle");
  const [error, setError] = useState<RealtimeConversationError | null>(null);
  const [activeSpeaker, setActiveSpeaker] =
    useState<TranslationSpeaker>("english");
  const [sourceDrafts, setSourceDrafts] = useState<
    Record<TranslationSpeaker, string>
  >({ english: "", spanish: "" });
  const [translatedDrafts, setTranslatedDrafts] = useState<
    Record<TranslationSpeaker, string>
  >({ english: "", spanish: "" });
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [metrics, setMetrics] = useState<RealtimeMetrics>(EMPTY_METRICS);
  const [muted, setMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessions = useRef<
    Partial<Record<TranslationDirectionKey, SessionRuntime>>
  >({});
  const currentRunId = useRef(0);
  const setupStartedAt = useRef(0);
  const lastSpeakerStopAt = useRef<number | null>(null);
  const timer = useRef<number | null>(null);

  const stopAll = useCallback((nextStatus: RealtimeConversationStatus) => {
    Object.values(sessions.current).forEach((session) => {
      if (!session) return;
      session.stale = true;
      session.stream.getTracks().forEach((track) => track.stop());
      session.channel.close();
      session.peer.close();
      session.audio.pause();
      session.audio.srcObject = null;
      if (session.localSessionId)
        void fetch("/api/realtime/session/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ localSessionId: session.localSessionId }),
          keepalive: true,
        });
    });
    sessions.current = {};
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    setStatus(nextStatus);
    setActiveSpeaker("english");
  }, []);

  const setDirectionActive = useCallback(
    (speaker: TranslationSpeaker | null) => {
      Object.values(sessions.current).forEach((session) => {
        if (!session) return;
        const enabled = speaker === session.direction.speaker;
        session.stream
          .getAudioTracks()
          .forEach((track) => (track.enabled = enabled));
      });
      if (speaker) setActiveSpeaker(speaker);
    },
    [],
  );

  const finalizeTurn = useCallback((speaker: TranslationSpeaker) => {
    const direction = directionForSpeaker(speaker);
    setSourceDrafts((currentSources) => {
      setTranslatedDrafts((currentTranslations) => {
        const sourceText = currentSources[speaker].trim();
        const translatedText = currentTranslations[speaker].trim();
        if (sourceText || translatedText) {
          setHistory((currentHistory) => [
            ...currentHistory,
            {
              id: `${Date.now()}-${speaker}`,
              speaker,
              sourceLanguage: direction.sourceLanguage,
              targetLanguage: direction.targetLanguage,
              sourceText,
              translatedText,
              createdAt: Date.now(),
            },
          ]);
        }
        return { ...currentTranslations, [speaker]: "" };
      });
      return { ...currentSources, [speaker]: "" };
    });
    if (lastSpeakerStopAt.current) {
      const latency = performance.now() - lastSpeakerStopAt.current;
      setMetrics((current) => ({
        ...current,
        endOfUtteranceLatencyMs: Math.round(latency),
      }));
      lastSpeakerStopAt.current = null;
    }
  }, []);

  const handleRealtimeEvent = useCallback(
    (
      runId: number,
      direction: TranslationDirection,
      rawEvent: MessageEvent<string>,
    ) => {
      if (runId !== currentRunId.current) return;
      const session = sessions.current[direction.key];
      if (!session || session.stale) return;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(rawEvent.data) as Record<string, unknown>;
      } catch {
        return;
      }
      const type = String(event.type ?? "");
      const delta = extractEventText(event);
      if (isSourceTranscriptEvent(type) && delta) {
        setSourceDrafts((current) => ({
          ...current,
          [direction.speaker]: appendTranscriptDelta(
            current[direction.speaker],
            delta,
          ),
        }));
        setMetrics((current) =>
          current.firstSourceTranscriptMs === null
            ? {
                ...current,
                firstSourceTranscriptMs: Math.round(
                  performance.now() - session.startedAt,
                ),
              }
            : current,
        );
      }
      if (isTranslatedTranscriptEvent(type) && delta) {
        setTranslatedDrafts((current) => ({
          ...current,
          [direction.speaker]: appendTranscriptDelta(
            current[direction.speaker],
            delta,
          ),
        }));
        setMetrics((current) =>
          current.firstTranslatedTranscriptMs === null
            ? {
                ...current,
                firstTranslatedTranscriptMs: Math.round(
                  performance.now() - session.startedAt,
                ),
              }
            : current,
        );
      }
      if (isFinalTurnEvent(type)) {
        finalizeTurn(direction.speaker);
      }
    },
    [finalizeTurn],
  );

  const connectDirection = useCallback(
    async (direction: TranslationDirection, runId: number) => {
      const secretResponse = await fetch("/api/realtime/translation-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLanguage: direction.sourceLanguage,
          targetLanguage: direction.targetLanguage,
          voice: "alloy",
        }),
      });
      const secretPayload = (await secretResponse.json().catch(() => ({}))) as
        Record<string, unknown> | { error?: { code?: string } };
      if (
        !secretResponse.ok ||
        !("ok" in secretPayload) ||
        secretPayload.ok !== true
      ) {
        const errorPayload =
          "error" in secretPayload &&
          typeof secretPayload.error === "object" &&
          secretPayload.error
            ? (secretPayload.error as { code?: unknown })
            : null;
        const code = errorPayload?.code;
        throw new Error(classifySecretError(code));
      }
      const clientSecret = extractClientSecret(secretPayload);
      if (!clientSecret) throw new Error("client_secret_failed");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.getAudioTracks().forEach((track) => (track.enabled = false));
      const peer = new RTCPeerConnection();
      const audio = new Audio();
      audio.autoplay = true;
      audio.muted = muted;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        void audio.play().catch(() => setError("autoplay_blocked"));
        setMetrics((current) =>
          current.firstTranslatedAudioMs === null
            ? {
                ...current,
                firstTranslatedAudioMs: Math.round(
                  performance.now() - setupStartedAt.current,
                ),
              }
            : current,
        );
      };
      peer.onconnectionstatechange = () => {
        if (runId !== currentRunId.current) return;
        if (peer.connectionState === "failed") {
          setMetrics((current) => ({
            ...current,
            reconnectCount: current.reconnectCount + 1,
          }));
          setStatus("reconnecting");
          setError("network_interrupted");
        }
        if (peer.connectionState === "connected") {
          setStatus("connected");
        }
        if (peer.connectionState === "closed") {
          setStatus((current) => (current === "ended" ? current : "paused"));
        }
      };
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = peer.createDataChannel(
        `alma-translation-${direction.key}`,
      );
      channel.onmessage = (event) =>
        handleRealtimeEvent(runId, direction, event);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const answerResponse = await fetch(
        "https://api.openai.com/v1/realtime/translations/calls",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );
      if (!answerResponse.ok) throw new Error("webrtc_connection_failed");
      await peer.setRemoteDescription({
        type: "answer",
        sdp: await answerResponse.text(),
      });
      sessions.current[direction.key] = {
        direction,
        peer,
        channel,
        stream,
        audio,
        startedAt: performance.now(),
        localSessionId:
          typeof secretPayload.localSessionId === "string"
            ? secretPayload.localSessionId
            : null,
        stale: false,
      };
    },
    [handleRealtimeEvent, muted],
  );

  const prepare = useCallback(async () => {
    if (status === "connecting" || status === "connected") return;
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setStatus("fallback");
      setError("unsupported_browser");
      return;
    }
    setStatus("connecting");
    setError(null);
    setMetrics(EMPTY_METRICS);
    setupStartedAt.current = performance.now();
    const runId = currentRunId.current + 1;
    currentRunId.current = runId;
    try {
      await Promise.all(
        TRANSLATION_DIRECTION_LIST.map((direction) =>
          connectDirection(direction, runId),
        ),
      );
      if (runId !== currentRunId.current) return;
      setMetrics((current) => ({
        ...current,
        connectionSetupMs: Math.round(
          performance.now() - setupStartedAt.current,
        ),
      }));
      setStatus("connected");
      setDirectionActive(null);
      timer.current = window.setInterval(
        () =>
          setElapsedSeconds(
            Math.round((performance.now() - setupStartedAt.current) / 1000),
          ),
        1000,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? (error.message as RealtimeConversationError)
          : "webrtc_connection_failed";
      setError(message);
      setStatus("fallback");
      stopAll("fallback");
    }
  }, [connectDirection, setDirectionActive, status, stopAll]);

  const startSpeaker = useCallback(
    (speaker: TranslationSpeaker) => {
      if (status !== "connected" && status !== "paused") return;
      setStatus("connected");
      setDirectionActive(speaker);
    },
    [setDirectionActive, status],
  );

  const stopSpeaker = useCallback(
    (speaker: TranslationSpeaker) => {
      lastSpeakerStopAt.current = performance.now();
      setDirectionActive(null);
      finalizeTurn(speaker);
    },
    [finalizeTurn, setDirectionActive],
  );

  const pause = useCallback(() => {
    setDirectionActive(null);
    setStatus("paused");
  }, [setDirectionActive]);

  const end = useCallback(() => {
    currentRunId.current += 1;
    stopAll("ended");
  }, [stopAll]);

  const toggleMute = useCallback(() => {
    setMuted((currentMuted) => {
      const nextMuted = !currentMuted;
      Object.values(sessions.current).forEach((session) => {
        if (session) session.audio.muted = nextMuted;
      });
      return nextMuted;
    });
  }, []);

  const replayLatest = useCallback(() => {
    const latestDirection = history.at(-1)?.speaker;
    if (!latestDirection) return;
    const session = sessions.current[directionForSpeaker(latestDirection).key];
    void session?.audio.play().catch(() => setError("autoplay_blocked"));
  }, [history]);

  const swapSides = useCallback(() => {
    setActiveSpeaker((speaker) => oppositeSpeaker(speaker));
  }, []);

  const clearTranscript = useCallback(() => {
    setHistory([]);
    setSourceDrafts({ english: "", spanish: "" });
    setTranslatedDrafts({ english: "", spanish: "" });
  }, []);

  useEffect(() => {
    return () => end();
  }, [end]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) end();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [end]);

  return {
    status,
    error,
    activeSpeaker,
    sourceDrafts,
    translatedDrafts,
    history,
    metrics,
    muted,
    elapsedSeconds,
    prepare,
    startSpeaker,
    stopSpeaker,
    pause,
    end,
    toggleMute,
    replayLatest,
    swapSides,
    clearTranscript,
  };
}
