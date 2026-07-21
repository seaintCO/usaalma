import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  executeUsageBoundary,
  type UsageExecutionPort,
} from "../lib/usage/executionBoundary";
import type { UsageReservation } from "../lib/usage/types";
import { evaluateUsageReservation } from "../lib/usage/engine";
import { USAGE_LIMITS } from "../lib/usage/limits";
import { parseClientMode } from "../lib/usage/modes";
import {
  isUsageSubscriptionActive,
  resolveUsagePeriod,
} from "../lib/usage/policy";

const starter = USAGE_LIMITS.starter;
const business = USAGE_LIMITS.business;
const base = {
  periodUsed: 0,
  dailyAiUsed: 0,
  activeProviderRequests: 0,
  activeBuilderJobs: 0,
};
const check = (
  limits: typeof starter,
  feature: Parameters<typeof evaluateUsageReservation>[0]["feature"],
  mode: Parameters<typeof evaluateUsageReservation>[0]["mode"],
  units: Parameters<typeof evaluateUsageReservation>[0]["units"],
  snapshot = base,
) => evaluateUsageReservation({ limits, feature, mode, units, snapshot });

assert.equal(
  check(starter, "ai_request", "instant", { requests: 1 }).allowed,
  true,
);
assert.equal(
  check(starter, "ai_request", "pro", { requests: 1 }).code,
  "feature_not_in_plan",
);
assert.equal(
  check(business, "ai_request", "pro", { requests: 1 }).allowed,
  true,
);
assert.equal(
  check(business, "ai_request", "research_pro", { requests: 1 }).code,
  "feature_not_in_plan",
);
assert.equal(
  check(
    starter,
    "ai_request",
    "instant",
    { requests: 1 },
    { ...base, periodUsed: 500 },
  ).code,
  "period_limit_reached",
);
assert.equal(
  check(
    starter,
    "ai_request",
    "instant",
    { requests: 1 },
    { ...base, dailyAiUsed: 25 },
  ).code,
  "daily_limit_reached",
);
assert.equal(
  check(
    starter,
    "ai_request",
    "instant",
    { requests: 1 },
    { ...base, activeProviderRequests: 1 },
  ).code,
  "concurrency_limit_reached",
);
assert.equal(
  check(
    business,
    "builder_build",
    null,
    { builderJobs: 1 },
    { ...base, activeBuilderJobs: 1 },
  ).code,
  "builder_concurrency_reached",
);
assert.equal(
  check(business, "image_generation", null, { images: 100 }, base).allowed,
  true,
);
assert.equal(
  check(business, "voice", null, { voiceSeconds: 18_001 }, base).code,
  "period_limit_reached",
);
assert.equal(
  check(starter, "document_analysis", null, { documentPages: 101 }, base).code,
  "period_limit_reached",
);
assert.equal(parseClientMode("gpt-5.6-sol"), null);
assert.equal(parseClientMode("research_pro"), null);
assert.equal(parseClientMode("thinking"), "thinking");
assert.equal(isUsageSubscriptionActive("active"), true);
assert.equal(isUsageSubscriptionActive("trialing"), true);
assert.equal(isUsageSubscriptionActive("past_due"), false);
assert.equal(isUsageSubscriptionActive("canceled"), false);
assert.deepEqual(
  resolveUsagePeriod({
    currentPeriodStart: "2026-07-10T00:00:00Z",
    currentPeriodEnd: "2026-08-10T00:00:00Z",
  }),
  { start: "2026-07-10T00:00:00Z", end: "2026-08-10T00:00:00Z" },
);

type FixtureInput = { key: string; reject?: boolean };
const calls = { provider: 0, settled: 0, released: 0, tokens: 0 };
const seen = new Set<string>();
const fixturePort: UsageExecutionPort<FixtureInput> = {
  async reserve(input) {
    if (input.reject) throw new Error("period_limit_reached");
    if (seen.has(input.key)) throw new Error("idempotency_replayed");
    seen.add(input.key);
    return {
      id: input.key,
      userId: "user",
      workspaceId: null,
      periodId: "period",
      feature: "ai_request",
      mode: "instant",
      model: "fixture",
      idempotencyKey: input.key,
      reservedUnits: { requests: 1 },
    } satisfies UsageReservation;
  },
  async settle(_reservation, _units, tokens) {
    calls.settled += 1;
    calls.tokens += tokens?.inputTokens ?? 0;
  },
  async release() {
    calls.released += 1;
  },
};
await assert.rejects(() =>
  executeUsageBoundary({
    port: fixturePort,
    reservation: { key: "blocked", reject: true },
    actualUnits: { requests: 1 },
    operation: async () => {
      calls.provider += 1;
      return {};
    },
  }),
);
assert.equal(
  calls.provider,
  0,
  "provider must not run after reservation rejection",
);
await executeUsageBoundary({
  port: fixturePort,
  reservation: { key: "success" },
  actualUnits: { requests: 1 },
  operation: async () => {
    calls.provider += 1;
    return { usage: 7 };
  },
  usage: (result) => ({ inputTokens: result.usage }),
});
assert.equal(calls.settled, 1);
assert.equal(calls.tokens, 7);
await assert.rejects(() =>
  executeUsageBoundary({
    port: fixturePort,
    reservation: { key: "failure" },
    actualUnits: { requests: 1 },
    operation: async () => {
      calls.provider += 1;
      throw new Error("provider_failed");
    },
  }),
);
assert.equal(calls.released, 1);
await assert.rejects(
  () =>
    executeUsageBoundary({
      port: fixturePort,
      reservation: { key: "success" },
      actualUnits: { requests: 1 },
      operation: async () => ({}),
    }),
  /idempotency_replayed/,
);
assert.deepEqual(
  resolveUsagePeriod({ now: new Date("2026-12-15T12:00:00Z") }),
  { start: "2026-12-01T00:00:00.000Z", end: "2027-01-01T00:00:00.000Z" },
);

const migration = readFileSync(
  "supabase/migrations/20260721001000_alma_ai_usage_control.sql",
  "utf8",
);
for (const contract of [
  "pg_advisory_xact_lock",
  "idempotency_key",
  "expires_at <= now()",
  "service_role",
  "enable row level security",
  "actual_input_tokens",
  "actual_cached_tokens",
  "actual_reasoning_tokens",
])
  assert.ok(
    migration.includes(contract),
    `migration contract missing: ${contract}`,
  );
const usagePage = readFileSync("app/usage/page.tsx", "utf8");
for (const copy of [
  "ALMA usage",
  "Uso de ALMA",
  "Research Pro",
  "Actividad reciente",
])
  assert.ok(usagePage.includes(copy), `usage interface copy missing: ${copy}`);

const internalPaidProviderModules = new Set([
  "lib/ai/actions/classifyAction.ts",
  "lib/ai/extractors/memoryExtractor.ts",
  "lib/ai/images/optimizeImagePrompt.ts",
  "lib/ai/router/classifyAlmaRoute.ts",
  "lib/alma/chat/processPlannerAndToolChatRun.ts",
  "lib/alma/creative/generateCampaignCopy.ts",
  "lib/communications/translationService.ts",
  "lib/creative/brandKit.ts",
  "lib/creative/nocturaiPrompt.ts",
  "lib/creative/promptOptimizer.ts",
  "lib/creative/providers/openaiImage.provider.ts",
  "lib/creative/providers/openaiImageEdit.provider.ts",
  "lib/launch-studio/generateLaunchDemo.ts",
  "lib/tools/gmail/gmailTools.ts",
  "workers/builder/gateway/index.ts",
]);
const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? walk(path)
      : /\.(ts|tsx)$/.test(name)
        ? [relative(".", path).replaceAll("\\", "/")]
        : [];
  });
const paidFiles = [...walk("app"), ...walk("lib"), ...walk("workers")].filter(
  (file) => /new OpenAI|api\.openai\.com/.test(readFileSync(file, "utf8")),
);
for (const file of paidFiles) {
  const source = readFileSync(file, "utf8");
  assert.ok(
    /reserveUsage|withUsageReservation|usage_reservation_id/.test(source) ||
      internalPaidProviderModules.has(file),
    `unmetered paid-provider entry point: ${file}`,
  );
}
for (const file of internalPaidProviderModules)
  assert.ok(paidFiles.includes(file), `stale paid-provider allowlist: ${file}`);
for (const sourceFile of [
  "app/usage/page.tsx",
  "components/dashboard-chat/ChatWorkspace.tsx",
  "lib/usage/service.ts",
])
  assert.ok(
    !/unlimited/i.test(readFileSync(sourceFile, "utf8")),
    `forbidden usage claim in ${sourceFile}`,
  );
console.log(
  `ALMA usage checks passed (limits, modes, periods, security contracts, EN/ES UI, ${paidFiles.length} provider files audited).`,
);
