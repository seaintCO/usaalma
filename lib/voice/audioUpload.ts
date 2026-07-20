export const MAX_TRANSCRIPTION_AUDIO_BYTES = 25 * 1024 * 1024;

export type SupportedTranscriptionContainer =
  | "audio/webm"
  | "video/webm"
  | "audio/mp4"
  | "audio/mpeg"
  | "audio/wav"
  | "audio/x-wav"
  | "audio/m4a"
  | "audio/x-m4a";

export type TranscriptionAudioFileInfo = {
  extension: "webm" | "mp4" | "mp3" | "wav" | "m4a";
  fileName: string;
  mimeType: Exclude<SupportedTranscriptionContainer, "video/webm">;
  receivedMimeType: string;
};

export const SUPPORTED_TRANSCRIPTION_CONTAINERS = [
  "audio/webm",
  "video/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/x-m4a",
] as const;

export function normalizeAudioMimeType(value: unknown) {
  return typeof value === "string"
    ? value.toLowerCase().trim().split(";")[0]?.trim() || ""
    : "";
}

export function getTranscriptionAudioFileInfo(
  mimeType: unknown,
): TranscriptionAudioFileInfo | null {
  const receivedMimeType = normalizeAudioMimeType(mimeType);

  switch (receivedMimeType) {
    case "audio/webm":
    case "video/webm":
      return {
        extension: "webm",
        fileName: "recording.webm",
        mimeType: "audio/webm",
        receivedMimeType,
      };
    case "audio/mp4":
      return {
        extension: "mp4",
        fileName: "recording.mp4",
        mimeType: "audio/mp4",
        receivedMimeType,
      };
    case "audio/mpeg":
      return {
        extension: "mp3",
        fileName: "recording.mp3",
        mimeType: "audio/mpeg",
        receivedMimeType,
      };
    case "audio/wav":
    case "audio/x-wav":
      return {
        extension: "wav",
        fileName: "recording.wav",
        mimeType: "audio/wav",
        receivedMimeType,
      };
    case "audio/m4a":
    case "audio/x-m4a":
      return {
        extension: "m4a",
        fileName: "recording.m4a",
        mimeType: "audio/m4a",
        receivedMimeType,
      };
    default:
      return null;
  }
}
