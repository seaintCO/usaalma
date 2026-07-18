import { readFileSync } from "node:fs";

const requiredFiles = [
  "app/translator/page.tsx",
  "app/api/realtime/session/route.ts",
  "app/api/translator/transcribe/route.ts",
  "app/api/translator/speech/route.ts",
  "app/api/memory/route.ts",
  "components/voice/AlmaVoiceControls.tsx",
  "lib/voice/config.ts",
  "lib/voice/repository.ts",
  "supabase/migrations/20260718006000_alma_realtime_voice_memory.sql",
];

const requiredSnippets = [
  ["app/api/realtime/session/route.ts", "realtime/client_secrets"],
  ["app/api/realtime/session/route.ts", "getOpenAIApiKey"],
  ["lib/voice/config.ts", "OPENAI_API_KEY"],
  ["app/api/realtime/session/route.ts", "EntitlementService.checkModuleAccess"],
  ["components/voice/AlmaVoiceControls.tsx", "RTCPeerConnection"],
  ["app/translator/page.tsx", "MediaRecorder"],
  ["app/api/translator/transcribe/route.ts", "audio.transcriptions.create"],
  ["app/api/translator/transcribe/route.ts", "getTranscriptionAudioFileInfo"],
  ["app/api/translator/transcribe/route.ts", "supportedContainers"],
  ["app/api/translator/transcribe/route.ts", "audio_too_large"],
  ["app/api/translator/speech/route.ts", "audio.speech.create"],
  ["app/api/translator/speech/route.ts", "getSpeechModel"],
  [
    "supabase/migrations/20260718006000_alma_realtime_voice_memory.sql",
    "voice_sessions",
  ],
  [
    "supabase/migrations/20260718006000_alma_realtime_voice_memory.sql",
    "conversation_memory_candidates",
  ],
];

for (const file of requiredFiles) {
  readFileSync(file, "utf8");
}

for (const [file, snippet] of requiredSnippets) {
  const source = readFileSync(file, "utf8");
  if (!source.includes(snippet)) {
    throw new Error(`${file} is missing ${snippet}`);
  }
}

const clientSources = [
  "app/translator/page.tsx",
  "components/voice/AlmaVoiceControls.tsx",
].map((file) => readFileSync(file, "utf8"));

if (clientSources.some((source) => source.includes("OPENAI_API_KEY"))) {
  throw new Error("Client voice surfaces must not reference OPENAI_API_KEY.");
}

console.log("ALMA realtime voice and translator verification passed.");
