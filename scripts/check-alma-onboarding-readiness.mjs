import fs from "node:fs";

const failures = [];

function read(path) {
  if (!fs.existsSync(path)) {
    failures.push(`missing:${path}`);
    return "";
  }
  return fs.readFileSync(path, "utf8");
}

const onboarding = read("app/onboarding/page.tsx");
const readiness = read("app/api/setup/readiness/route.ts");
const onboardingStatus = read("app/api/onboarding/status/route.ts");
const money = read("components/business-office/MoneyWorkspace.tsx");
const moneyOverview = read("app/api/business-office/overview/route.ts");
const googleCompatibility = read("app/api/oauth/google/start/route.ts");
const connectorConfig = read("lib/connectors/config.ts");
const connectorRepository = read("lib/connectors/repository.ts");
const envExample = read(".env.example");
const activationScript = read("scripts/activate-alma-database.ps1");

for (const contract of [
  'fetch("/api/setup/readiness"',
  '"/api/business-office/profile"',
  "/api/connectors/oauth/${key}/start?returnTo=%2Fonboarding",
  '"/api/oauth/stripe/start?returnTo=%2Fonboarding"',
  '"/voice-agents"',
  'params.get("resume") === "money"',
]) {
  if (!onboarding.includes(contract)) failures.push(`onboarding:${contract}`);
}

for (const contract of [
  "business_transactions",
  "voice_agent_profiles",
  "ConnectorRepository.listSummaries",
  "owner_action_required",
]) {
  if (!readiness.includes(contract)) failures.push(`readiness:${contract}`);
}

for (const contract of [
  'from("business_profiles")',
  "onboarding_completed_at",
  "activationRequired",
]) {
  if (!onboardingStatus.includes(contract)) {
    failures.push(`onboarding-status:${contract}`);
  }
}
if (onboardingStatus.includes("OnboardingRepository")) {
  failures.push("onboarding-status:legacy-repository");
}

if (
  `${money}\n${moneyOverview}`.includes(
    "Apply the ALMA Business Office migration",
  )
) {
  failures.push("money:customer-visible-migration-instruction");
}
if (!money.includes('href="/onboarding?resume=money"')) {
  failures.push("money:guided-setup-link");
}
if (!googleCompatibility.includes("/api/connectors/oauth/gmail/start")) {
  failures.push("google:legacy-route-not-canonicalized");
}
if (!connectorConfig.includes("return parsed.origin")) {
  failures.push("connectors:callback-origin-not-normalized");
}
if (connectorRepository.includes("`Missing ${missing.join")) {
  failures.push("connectors:technical-env-message-visible");
}

for (const name of [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "STRIPE_CLIENT_ID",
  "QUICKBOOKS_CLIENT_ID",
  "QUICKBOOKS_CLIENT_SECRET",
]) {
  if (!envExample.includes(`${name}=`)) failures.push(`env:${name}`);
}

for (const contract of [
  "npx supabase link --project-ref",
  "npx supabase db push",
  "npm run onboarding:check",
  "npm run business-office:check",
]) {
  if (!activationScript.includes(contract)) {
    failures.push(`activation-script:${contract}`);
  }
}

if (failures.length) {
  console.error(
    JSON.stringify(
      { ok: false, code: "ALMA_ONBOARDING_READINESS_FAILED", failures },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      code: "ALMA_ONBOARDING_READINESS_PASSED",
      checks: [
        "guided onboarding",
        "canonical onboarding completion gate",
        "customer-safe Money recovery",
        "canonical Google OAuth",
        "safe connector configuration states",
        "owner environment template",
        "guarded PowerShell database activation",
      ],
    },
    null,
    2,
  ),
);
