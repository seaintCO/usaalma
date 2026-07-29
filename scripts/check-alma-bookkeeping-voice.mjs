import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  migration:
    "supabase/migrations/20260729001000_alma_bookkeeping_voice_agents.sql",
  bookkeeping: "components/business-office/BookkeepingWorkspace.tsx",
  receipts: "app/api/business-office/receipts/route.ts",
  reports: "app/api/business-office/reports/route.ts",
  payroll: "app/api/business-office/payroll/route.ts",
  voiceConnection: "app/api/voice-agents/connection/route.ts",
  voiceAgent: "app/api/voice-agents/route.ts",
  voiceSignedUrl: "app/api/voice-agents/[agentId]/signed-url/route.ts",
  voiceWebhook: "app/api/voice-agents/webhooks/elevenlabs/route.ts",
  voiceProvider: "lib/voice-agents/elevenlabs.ts",
  voiceWorkspace: "components/voice-agents/VoiceAgentWorkspace.tsx",
};

const source = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, path]) => [
      key,
      await readFile(path, "utf8"),
    ]),
  ),
);

for (const table of [
  "business_payroll_entries",
  "voice_agent_profiles",
  "voice_call_records",
  "voice_webhook_events",
]) {
  assert.match(
    source.migration,
    new RegExp(`create table if not exists public\\.${table}`),
  );
}

for (const section of ["receipts", "payroll", "tax", "reports"]) {
  assert.match(source.bookkeeping, new RegExp(`"${section}"`));
}
assert.match(source.receipts, /application\/pdf/);
assert.match(source.receipts, /image\/jpeg/);
assert.match(source.receipts, /15 \* 1024 \* 1024/);
assert.match(source.reports, /profitLoss/);
assert.match(source.reports, /invoiceAging/);
assert.match(source.reports, /text\/csv/);
assert.match(source.payroll, /calculated_gross_pay/);

assert.match(source.voiceConnection, /validateElevenLabsApiKey/);
assert.match(source.voiceConnection, /saveApiKeyConnection/);
assert.match(source.voiceAgent, /createElevenLabsAgent/);
assert.match(source.voiceSignedUrl, /getElevenLabsSignedUrl/);
assert.match(source.voiceSignedUrl, /checkModuleAccess/);
assert.match(source.voiceWebhook, /constructEvent/);
assert.match(source.voiceWebhook, /voice_webhook_events/);
assert.match(source.voiceWebhook, /post_call_transcription/);
assert.match(source.voiceProvider, /ElevenLabsClient/);
assert.match(source.voiceWorkspace, /API key is encrypted server-side/);

const retiredPlaintextRoutes = [
  "app/api/integrations/voice/save/route.ts",
  "app/api/integrations/elevenlabs/connect/route.ts",
  "app/api/voice/elevenlabs/route.ts",
];
for (const path of retiredPlaintextRoutes) {
  const value = await readFile(path, "utf8");
  assert.match(value, /status: 410/);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      code: "ALMA_BOOKKEEPING_VOICE_CONTRACT_PASSED",
      bookkeepingSections: 4,
      voiceProvider: "elevenlabs-byok",
      signedWebhook: true,
      plaintextLegacyRoutesRetired: retiredPlaintextRoutes.length,
    },
    null,
    2,
  ),
);
