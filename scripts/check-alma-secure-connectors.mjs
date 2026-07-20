import { readFileSync } from "node:fs";

const checks = [
  {
    file: "supabase/migrations/20260718004000_alma_secure_connectors.sql",
    required: [
      "create table if not exists public.provider_connections",
      "create table if not exists public.provider_connection_secrets",
      "revoke all on table public.provider_connection_secrets from anon, authenticated",
      "create table if not exists public.email_delivery_records",
      "unique(approval_id)",
      "create table if not exists public.office_estimate_follow_ups",
      "alma_user_can_access_workspace",
      'drop policy if exists "Users read owned or member workspaces"',
    ],
  },
  {
    file: "lib/connectors/oauthState.ts",
    required: [
      "CONNECTOR_OAUTH_STATE_COOKIE",
      "codeChallenge",
      "workspaceId",
      "crypto.timingSafeEqual",
      "returnPath",
      "httpOnly: true",
    ],
  },
  {
    file: "lib/connectors/repository.ts",
    required: [
      "ConnectorConfigurationError",
      "provider_connection_secrets",
      "encryptSecret",
      "decryptSecret",
      "listSummaries",
      "createDeliveryRecord",
      "completeDelivery",
      "failDelivery",
    ],
    forbidden: ['select("*").from("provider_connection_secrets")'],
  },
  {
    file: "lib/connectors/providers/google.ts",
    required: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://accounts.google.com/o/oauth2/v2/auth",
      "https://oauth2.googleapis.com/token",
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    ],
  },
  {
    file: "lib/connectors/providers/microsoft.ts",
    required: [
      "Mail.Send",
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      "https://graph.microsoft.com/v1.0/me/sendMail",
    ],
  },
  {
    file: "lib/platform/actions/actionExecutorRegistry.ts",
    required: [
      "sendConnectedEmail",
      "ConnectorRepository.createDeliveryRecord",
      "OfficeRepository.markEstimateDelivered",
      "OfficeRepository.scheduleEstimateFollowUp",
      "Estimate is not sendable. No email was sent.",
    ],
  },
  {
    file: "app/connections/page.tsx",
    required: [
      "/api/connections",
      "/api/connectors/oauth/",
      "configuration_required",
      "No account connected",
    ],
    forbidden: ["access_token", "refresh_token"],
  },
  {
    file: "app/api/connections/route.ts",
    required: ["ConnectorRepository.listSummaries"],
    forbidden: ["access_token", "refresh_token", "provider_connection_secrets"],
  },
  {
    file: "docs/alma-connector-setup.md",
    required: [
      "http://localhost:3000/api/connectors/oauth/gmail/callback",
      "http://localhost:3000/api/connectors/oauth/outlook/callback",
      "SUPABASE_SERVICE_ROLE_KEY",
      "provider_connection_secrets",
    ],
  },
];

let failed = false;

for (const check of checks) {
  const source = readFileSync(check.file, "utf8");
  for (const needle of check.required ?? []) {
    if (!source.includes(needle)) {
      console.error(`${check.file}: missing ${needle}`);
      failed = true;
    }
  }
  for (const needle of check.forbidden ?? []) {
    if (source.includes(needle)) {
      console.error(`${check.file}: forbidden ${needle}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log("Alma secure connector checks passed.");
