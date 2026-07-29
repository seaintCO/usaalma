import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const migration = read(
  "supabase/migrations/20260729004000_alma_managed_voice_budgets_invoice_delivery.sql",
);
assert.match(migration, /create table if not exists public\.business_budgets/i);
assert.match(
  migration,
  /create table if not exists public\.voice_agent_setup_orders/i,
);
assert.match(migration, /enable row level security/i);

const webhook = read("app/api/billing/webhook/route.ts");
assert.match(webhook, /voice_agent_setup/);
assert.match(webhook, /payment_status !== "paid"/);

const executor = read("lib/platform/actions/actionExecutorRegistry.ts");
assert.match(executor, /"office\.invoice\.deliver"/);
assert.match(executor, /attachments:/);
assert.match(executor, /createInvoicePdf/);

const delivery = read("app/api/invoices/[id]/delivery/route.ts");
assert.match(delivery, /prepareAuditedAction/);
assert.match(delivery, /approvalPolicy: "always_protected"/);

const google = read("lib/connectors/providers/google.ts");
const microsoft = read("lib/connectors/providers/microsoft.ts");
assert.match(google, /multipart\/mixed/);
assert.match(microsoft, /#microsoft\.graph\.fileAttachment/);

const voice = read("components/voice-agents/VoiceAgentWorkspace.tsx");
assert.match(voice, /Pay \$299 setup fee/);
assert.match(voice, /\/api\/voice-agents\/setup/);

const money = read("components/business-office/MoneyWorkspace.tsx");
assert.match(money, /Budgets and alerts/);
assert.match(money, /\/api\/business-office\/budgets/);

console.log("ALMA managed voice, budgets, and invoice delivery checks passed.");
