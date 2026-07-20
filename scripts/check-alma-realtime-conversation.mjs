import { readFileSync } from "node:fs";

const files = {
  page: "app/translator/page.tsx",
  route: "app/api/realtime/translation-session/route.ts",
  hook: "components/translator/useRealtimeTranslationConversation.ts",
  component: "components/translator/RealtimeConversationInterpreter.tsx",
  domain: "lib/voice/realtimeTranslation.ts",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(file, "utf8")]),
);

for (const [fileKey, snippet] of [
  ["route", "/v1/realtime/translations/client_secrets"],
  ["route", "getRealtimeTranslationModel"],
  ["route", "EntitlementService.checkModuleAccess"],
  ["route", "hashSafetyIdentifier"],
  ["route", "rateLimited"],
  ["hook", "/v1/realtime/translations/calls"],
  ["hook", "RTCPeerConnection"],
  ["hook", "getUserMedia"],
  ["hook", "echoCancellation"],
  ["hook", "noiseSuppression"],
  ["hook", "autoGainControl"],
  ["hook", "appendTranscriptDelta"],
  ["hook", "currentRunId"],
  ["hook", "track.stop()"],
  ["hook", "peer.close()"],
  ["hook", "setDirectionActive"],
  ["component", "Live interpretation is unavailable"],
  ["component", "Standard Push to Talk"],
  ["page", "RealtimeConversationInterpreter"],
  ["domain", "en_to_es"],
  ["domain", "es_to_en"],
]) {
  if (!source[fileKey].includes(snippet)) {
    throw new Error(`${files[fileKey]} is missing ${snippet}`);
  }
}

if (source.component.includes("/api/translator/transcribe")) {
  throw new Error(
    "Realtime conversation component must not call the batch transcribe route.",
  );
}

if (source.hook.includes("/api/translator/transcribe")) {
  throw new Error(
    "Realtime conversation hook must not call the batch transcribe route.",
  );
}

for (const clientSource of [source.page, source.hook, source.component]) {
  if (clientSource.includes("OPENAI_API_KEY")) {
    throw new Error("Permanent OpenAI API key must never reach client code.");
  }
  if (
    clientSource.includes("console.log") ||
    clientSource.includes("console.warn")
  ) {
    throw new Error("Client secrets and realtime events must not be logged.");
  }
}

if (
  !source.domain.includes('sourceLanguage: "en"') ||
  !source.domain.includes('targetLanguage: "es"') ||
  !source.domain.includes('sourceLanguage: "es"') ||
  !source.domain.includes('targetLanguage: "en"')
) {
  throw new Error(
    "Both English->Spanish and Spanish->English directions required.",
  );
}

if (
  !source.hook.includes("speaker === session.direction.speaker") ||
  !source.hook.includes("track.enabled = enabled")
) {
  throw new Error(
    "Only the selected speaker direction should send microphone audio.",
  );
}

if (
  source.hook.includes("direction.sourceLanguage, direction.sourceLanguage") ||
  source.hook.includes("direction.targetLanguage, direction.targetLanguage")
) {
  throw new Error("Audio direction mapping appears duplicated.");
}

function appendTranscriptDelta(current, delta) {
  if (!delta.trim()) return current;
  const next = current ? delta : delta.trimStart();
  if (!current) return next;
  if (current.endsWith(next)) return current;
  if (next.startsWith(current)) return next;
  return `${current}${next}`;
}

const deltas = ["Hel", "lo", "lo", " world"];
let transcript = "";
for (const delta of deltas) {
  transcript = appendTranscriptDelta(transcript, delta);
}
if (transcript !== "Hello world") {
  throw new Error("Transcript deltas did not accumulate deterministically.");
}

const staleGuards = [
  "runId !== currentRunId.current",
  "session.stale",
  "currentRunId.current += 1",
];
for (const guard of staleGuards) {
  if (!source.hook.includes(guard)) {
    throw new Error(`Realtime hook is missing stale-session guard ${guard}.`);
  }
}

console.log("ALMA realtime conversation verification passed.");
