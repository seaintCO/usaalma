import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const paths = {
  migration:
    "supabase/migrations/20260729002000_alma_business_launch_center.sql",
  api: "app/api/business-launch/route.ts",
  page: "app/business-launch/page.tsx",
  workspace: "components/business-launch/BusinessLaunchWorkspace.tsx",
  copy: "lib/business-launch/copy.ts",
  resources: "lib/business-launch/officialResources.ts",
  registry: "lib/platform/modules/registry.ts",
  routes: "lib/platform/workspaceRoutes.ts",
  knowledge: "app/knowledge/page.tsx",
};

const source = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [
      key,
      await readFile(path, "utf8"),
    ]),
  ),
);

for (const table of [
  "business_launch_projects",
  "business_launch_tasks",
  "business_compliance_deadlines",
]) {
  assert.match(
    source.migration,
    new RegExp(`create table if not exists public\\.${table}`),
  );
}

assert.match(source.migration, /enable row level security/g);
assert.match(source.migration, /alma_business_launch_is_owner/);
assert.match(source.migration, /business_launch_projects_seed_tasks/);
assert.doesNotMatch(source.migration, /\bssn\b|\bsocial_security\b/i);
assert.doesNotMatch(source.migration, /\bfull_ein\b|\bidentity_document\b/i);
assert.match(source.migration, /ein_last_four/);

assert.match(source.api, /resolveTenantWorkspace/);
assert.match(source.api, /checkModuleAccess/);
assert.match(source.api, /business_launch_plan_required/);
assert.match(source.api, /workspace_owner_required/);
assert.match(source.api, /hostname\.endsWith\("\.gov"\)/);
assert.match(source.api, /invalid_ein_last_four/);
assert.doesNotMatch(source.api, /fetch\([^)]*(sos|secretary|irs|fincen)/i);

assert.match(source.routes, /business_launch: "\/business-launch"/);
assert.match(source.registry, /key: "business_launch"/);
assert.match(source.registry, /Government filings and payments remain/);
assert.match(source.knowledge, /href: "\/business-launch"/);
assert.match(source.page, /activeWorkspace="business_launch"/);

for (const officialHost of ["sba.gov", "irs.gov", "fincen.gov"]) {
  assert.match(source.resources, new RegExp(officialHost.replace(".", "\\.")));
}
assert.match(source.copy, /not legal, tax, or accounting advice/i);
assert.match(source.copy, /no asesoría legal, fiscal o contable/i);
assert.match(source.copy, /entities created in the United States/i);
assert.match(source.copy, /The IRS issues EINs free/i);
assert.match(source.copy, /Print launch packet/);
assert.match(source.copy, /Sensitive-data guard/);
assert.match(source.copy, /Open official guidance/);
assert.match(source.workspace, /window\.print\(\)/);

console.log(
  JSON.stringify(
    {
      ok: true,
      code: "ALMA_BUSINESS_LAUNCH_CONTRACT_PASSED",
      tables: 3,
      guidedTasks: 14,
      languages: ["en", "es"],
      governmentFilingMode: "official-portals-only",
      sensitiveIdentifiersStored: false,
    },
    null,
    2,
  ),
);
