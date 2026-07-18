import { readFileSync } from "node:fs";

const requiredFiles = [
  "lib/connectors/providers/whatsapp.ts",
  "lib/connectors/whatsappState.ts",
  "app/api/connectors/whatsapp/start/route.ts",
  "app/api/connectors/whatsapp/callback/route.ts",
  "app/api/connectors/whatsapp/webhook/route.ts",
  "app/api/connectors/whatsapp/disconnect/route.ts",
  "app/api/communications/threads/route.ts",
  "app/api/communications/whatsapp/draft/route.ts",
  "app/communications/page.tsx",
  "supabase/migrations/20260718007000_alma_secure_whatsapp_communications.sql",
];

const requiredSnippets = [
  ["lib/connectors/providers/whatsapp.ts", "timingSafeEqual"],
  ["lib/connectors/providers/whatsapp.ts", "META_WEBHOOK_VERIFY_TOKEN"],
  ["lib/connectors/providers/whatsapp.ts", "requiresTemplate"],
  [
    "app/api/connectors/whatsapp/webhook/route.ts",
    "verifyWhatsAppWebhookSignature",
  ],
  ["app/api/connectors/whatsapp/webhook/route.ts", "recordWebhookEvent"],
  ["app/api/communications/whatsapp/draft/route.ts", "prepareAuditedAction"],
  ["lib/platform/actions/actionExecutorRegistry.ts", "whatsapp.message.send"],
  [
    "supabase/migrations/20260718007000_alma_secure_whatsapp_communications.sql",
    "whatsapp_delivery_records",
  ],
  [
    "supabase/migrations/20260718007000_alma_secure_whatsapp_communications.sql",
    "whatsapp_webhook_events",
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

const client = readFileSync("app/communications/page.tsx", "utf8");
if (
  client.includes("META_APP_SECRET") ||
  client.includes("APP_ENCRYPTION_KEY")
) {
  throw new Error(
    "Client communications page must not reference server secrets.",
  );
}

console.log("ALMA secure WhatsApp connector verification passed.");
