export const ALLOWED_REALTIME_MODELS = new Set([
  "gpt-realtime",
  "gpt-4o-realtime-preview",
  "gpt-4o-mini-realtime-preview",
]);

export const ALLOWED_TRANSCRIPTION_MODELS = new Set([
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
  "whisper-1",
]);

export const ALLOWED_SPEECH_MODELS = new Set(["gpt-4o-mini-tts", "tts-1"]);

export const ALLOWED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
]);

function configured(name: string, fallback: string, allowed: Set<string>) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  if (allowed.has(value)) return value;
  return fallback;
}

export function getRealtimeModel(premium = false): string {
  return premium
    ? configured(
        "ALMA_REALTIME_PREMIUM_MODEL",
        getRealtimeModel(false),
        ALLOWED_REALTIME_MODELS,
      )
    : configured(
        "ALMA_REALTIME_MODEL",
        "gpt-realtime",
        ALLOWED_REALTIME_MODELS,
      );
}

export function getRealtimeTranslationModel() {
  return configured(
    "ALMA_REALTIME_TRANSLATION_MODEL",
    getRealtimeModel(false),
    ALLOWED_REALTIME_MODELS,
  );
}

export function getTranscriptionModel() {
  return configured(
    "ALMA_TRANSCRIPTION_MODEL",
    "gpt-4o-mini-transcribe",
    ALLOWED_TRANSCRIPTION_MODELS,
  );
}

export function getSpeechModel() {
  return configured(
    "ALMA_SPEECH_MODEL",
    "gpt-4o-mini-tts",
    ALLOWED_SPEECH_MODELS,
  );
}

export function normalizeVoice(value: unknown) {
  return typeof value === "string" && ALLOWED_VOICES.has(value)
    ? value
    : "alloy";
}

export function voiceInstructions() {
  return [
    "Warm, calm, professional, confident, bilingual, and natural.",
    "Use neutral Latin American Spanish and clear US English.",
    "Avoid exaggerated enthusiasm, announcer behavior, robotic cadence, and unnecessary filler.",
    "Read-only tools may be used. External, financial, destructive, or state-changing actions must create approvals before execution.",
  ].join(" ");
}
