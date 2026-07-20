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

export const ALLOWED_SPEECH_MODELS = new Set([
  "gpt-4o-mini-tts",
  "tts-1",
  "tts-1-hd",
]);

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

export class VoiceConfigurationError extends Error {
  code:
    | "openai_api_key_missing"
    | "invalid_realtime_model"
    | "invalid_transcription_model"
    | "invalid_speech_model";

  constructor(code: VoiceConfigurationError["code"], message: string) {
    super(message);
    this.name = "VoiceConfigurationError";
    this.code = code;
  }
}

function modelAllowed(
  value: string,
  allowed: Set<string>,
  family: "realtime" | "transcription" | "speech",
) {
  if (allowed.has(value)) return true;
  if (family === "realtime") {
    return /^gpt(-4o.*)?-.*realtime/i.test(value);
  }
  return false;
}

function configured({
  name,
  fallback,
  allowed,
  family,
  code,
}: {
  name: string;
  fallback: string;
  allowed: Set<string>;
  family: "realtime" | "transcription" | "speech";
  code: VoiceConfigurationError["code"];
}) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  if (modelAllowed(value, allowed, family)) return value;
  throw new VoiceConfigurationError(
    code,
    `${name} is configured with an unsupported model.`,
  );
}

export function getOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === "sk-..." || apiKey.includes("your-key")) {
    throw new VoiceConfigurationError(
      "openai_api_key_missing",
      "OPENAI_API_KEY is not available to the server runtime.",
    );
  }
  return apiKey;
}

export function getRealtimeModel(premium = false): string {
  return premium
    ? configured({
        name: "ALMA_REALTIME_PREMIUM_MODEL",
        fallback: getRealtimeModel(false),
        allowed: ALLOWED_REALTIME_MODELS,
        family: "realtime",
        code: "invalid_realtime_model",
      })
    : configured({
        name: "ALMA_REALTIME_MODEL",
        fallback: "gpt-realtime",
        allowed: ALLOWED_REALTIME_MODELS,
        family: "realtime",
        code: "invalid_realtime_model",
      });
}

export function getRealtimeTranslationModel() {
  return configured({
    name: "ALMA_REALTIME_TRANSLATION_MODEL",
    fallback: getRealtimeModel(false),
    allowed: ALLOWED_REALTIME_MODELS,
    family: "realtime",
    code: "invalid_realtime_model",
  });
}

export function getTranscriptionModel() {
  return configured({
    name: "ALMA_TRANSCRIPTION_MODEL",
    fallback: "gpt-4o-mini-transcribe",
    allowed: ALLOWED_TRANSCRIPTION_MODELS,
    family: "transcription",
    code: "invalid_transcription_model",
  });
}

export function getSpeechModel() {
  return configured({
    name: "ALMA_SPEECH_MODEL",
    fallback: "gpt-4o-mini-tts",
    allowed: ALLOWED_SPEECH_MODELS,
    family: "speech",
    code: "invalid_speech_model",
  });
}

export function normalizeVoice(value: unknown) {
  return typeof value === "string" && ALLOWED_VOICES.has(value)
    ? value
    : "alloy";
}

export function assertVoice(value: unknown) {
  if (typeof value !== "string" || !ALLOWED_VOICES.has(value)) {
    return "alloy";
  }
  return value;
}

export function voiceInstructions() {
  return [
    "Warm, calm, professional, confident, bilingual, and natural.",
    "Use neutral Latin American Spanish and clear US English.",
    "Avoid exaggerated enthusiasm, announcer behavior, robotic cadence, and unnecessary filler.",
    "Read-only tools may be used. External, financial, destructive, or state-changing actions must create approvals before execution.",
  ].join(" ");
}
