"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { useState } from "react";

function Session({
  agentId,
  language,
}: {
  agentId: string;
  language: "en" | "es";
}) {
  const [error, setError] = useState("");
  const conversation = useConversation({
    onError: () =>
      setError(
        language === "es"
          ? "La conversación no pudo conectarse."
          : "The conversation could not connect.",
      ),
  });

  async function start() {
    setError("");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const response = await fetch(`/api/voice-agents/${agentId}/signed-url`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok || !payload.signedUrl) throw new Error("unavailable");
      conversation.startSession({
        signedUrl: payload.signedUrl,
        connectionType: "websocket",
      });
    } catch {
      setError(
        language === "es"
          ? "Permite el micrófono y vuelve a intentarlo."
          : "Allow microphone access and try again.",
      );
    }
  }

  return (
    <div className="rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] p-4">
      <div className="flex flex-wrap items-center gap-2">
        {conversation.status === "disconnected" ? (
          <button
            type="button"
            onClick={() => void start()}
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white"
          >
            <Mic className="h-4 w-4" />
            {language === "es" ? "Hablar con el agente" : "Talk to agent"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => conversation.setMuted(!conversation.isMuted)}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            >
              {conversation.isMuted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {conversation.isMuted
                ? language === "es"
                  ? "Activar micrófono"
                  : "Unmute"
                : language === "es"
                  ? "Silenciar"
                  : "Mute"}
            </button>
            <button
              type="button"
              onClick={() => conversation.endSession()}
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white"
            >
              <PhoneOff className="h-4 w-4" />
              {language === "es" ? "Terminar" : "End"}
            </button>
          </>
        )}
        <span className="inline-flex items-center gap-2 text-xs text-[#667085]">
          <Volume2 className="h-4 w-4" />
          {conversation.status} · {conversation.mode}
        </span>
      </div>
      {error ? <p className="mt-3 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export default function BrowserVoiceSession(props: {
  agentId: string;
  language: "en" | "es";
}) {
  return (
    <ConversationProvider>
      <Session {...props} />
    </ConversationProvider>
  );
}
