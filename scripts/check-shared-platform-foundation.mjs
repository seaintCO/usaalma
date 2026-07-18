import { readFileSync } from "node:fs";

const files = {
  registry: "lib/platform/modules/registry.ts",
  entitlements: "lib/platform/entitlements/service.ts",
  tenantResolver: "lib/platform/workspace/tenantResolver.ts",
  approvalsTypes: "lib/platform/approvals/types.ts",
  approvalsRepository: "lib/platform/approvals/repository.ts",
  executionBoundary: "lib/platform/actions/executionBoundary.ts",
  installRoute: "app/api/modules/install/route.ts",
  toolRegistry: "lib/ai/tools/registry.ts",
  migration:
    "supabase/migrations/20260718001000_alma_shared_platform_foundation.sql",
};

function read(name) {
  return readFileSync(files[name], "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const registry = read("registry");
for (const group of [
  "free_core",
  "office",
  "creator",
  "studio",
  "trader",
  "fitness",
]) {
  assert(registry.includes(`"${group}"`), `Missing module group: ${group}`);
}

for (const moduleKey of [
  "tasks",
  "documents",
  "crm",
  "construction",
  "images",
  "creative_studio",
  "launch_studio",
  "trader",
  "fitness",
]) {
  assert(
    registry.includes(`key: "${moduleKey}"`),
    `Missing module key: ${moduleKey}`,
  );
}

const entitlements = read("entitlements");
assert(
  entitlements.includes("SubscriptionRepository.get") &&
    entitlements.includes("evaluateModuleAccess"),
  "Entitlement service must use subscription compatibility and expose a canonical evaluator.",
);

const tenantResolver = read("tenantResolver");
assert(
  tenantResolver.includes("workspace_members") &&
    tenantResolver.includes("personal_fallback"),
  "Tenant resolver must support owned/member workspaces and personal fallback.",
);

const approvalsTypes = read("approvalsTypes");
for (const status of [
  "proposed",
  "awaiting_approval",
  "approved",
  "rejected",
  "executing",
  "completed",
  "failed",
]) {
  assert(
    approvalsTypes.includes(`"${status}"`),
    `Missing approval status: ${status}`,
  );
}
assert(
  approvalsTypes.includes("canTransitionActionApproval"),
  "Approval transitions must be centralized.",
);

const executionBoundary = read("executionBoundary");
assert(
  executionBoundary.includes("prepareAuditedAction") &&
    executionBoundary.includes("ActionApprovalRequiredError"),
  "Execution boundary must prepare and enforce approvals.",
);

const installRoute = read("installRoute");
assert(
  installRoute.includes("EntitlementService.checkModuleAccess") &&
    !installRoute.includes("moduleAllowed"),
  "Module install route must use canonical entitlement reads.",
);

const toolRegistry = read("toolRegistry");
assert(
  toolRegistry.includes("prepareAuditedAction") &&
    toolRegistry.includes('actionKey: "gmail.send"') &&
    toolRegistry.includes("requiresApproval: true"),
  "External Gmail send must pass through the shared approval boundary.",
);

const migration = read("migration");
for (const sqlToken of [
  "create table if not exists public.action_approvals",
  "create table if not exists public.action_audit_logs",
  "create table if not exists public.workspaces",
  "enable row level security",
  "alma_assert_platform_workspace_ownership",
]) {
  assert(migration.includes(sqlToken), `Migration missing ${sqlToken}`);
}

console.log("Shared platform foundation checks passed.");
