import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requiredFiles = [
  "app/customers/page.tsx",
  "app/inbox/page.tsx",
  "app/work/page.tsx",
  "app/money/page.tsx",
  "app/automations/page.tsx",
  "app/knowledge/page.tsx",
  "app/reports/page.tsx",
  "app/api/business-office/overview/route.ts",
  "app/api/business-office/profile/route.ts",
  "lib/connectors/providers/quickbooks.ts",
  "supabase/migrations/20260728001000_alma_business_office_refocus.sql",
  "PRODUCT_SCOPE.md",
  "LAUNCH_CHECKLIST.md",
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing:${file}`);
}

const navigation = read("components/alma-shell/WorkspaceNavigation.tsx");
for (const route of [
  "customers",
  "inbox",
  "work",
  "money",
  "automations",
  "knowledge",
  "reports",
]) {
  if (!navigation.includes(`"${route}"`)) {
    failures.push(`navigation:${route}`);
  }
}

const registry = read("lib/platform/modules/registry.ts");
for (const hidden of [
  "construction",
  "images",
  "creative",
  "launch",
  "trader",
  "fitness",
  "agent_builder",
  "builder",
]) {
  const activeSet = registry.slice(
    registry.indexOf("ACTIVE_BUSINESS_OFFICE_MODULES"),
  );
  if (activeSet.match(new RegExp(`["']${hidden}["']`))) {
    failures.push(`legacy_module_active:${hidden}`);
  }
}

const migration = read(
  "supabase/migrations/20260728001000_alma_business_office_refocus.sql",
);
for (const table of [
  "business_profiles",
  "business_transactions",
  "business_receipts",
  "business_appointments",
  "business_payroll_periods",
  "business_tax_checklists",
  "quickbooks_connections",
  "workspace_autonomy_settings",
]) {
  if (!migration.includes(`public.${table}`)) failures.push(`schema:${table}`);
}
if (!migration.includes("enable row level security"))
  failures.push("schema:rls");

const quickbooks = read("lib/connectors/providers/quickbooks.ts");
if (!quickbooks.includes("appcenter.intuit.com/connect/oauth2")) {
  failures.push("quickbooks:authorization");
}
if (!quickbooks.includes("oauth.platform.intuit.com")) {
  failures.push("quickbooks:token_exchange");
}

const nextConfig = read("next.config.ts");
if (!nextConfig.includes("ALMA_LEGACY_MODULES_ENABLED")) {
  failures.push("legacy_routes:not_guarded");
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      code: "ALMA_BUSINESS_OFFICE_REFOCUS_READY",
      verifiedFiles: requiredFiles.length,
      activeNavigation: [
        "home",
        "customers",
        "inbox",
        "work",
        "money",
        "automations",
        "alma",
        "knowledge",
        "reports",
      ],
    },
    null,
    2,
  ),
);
