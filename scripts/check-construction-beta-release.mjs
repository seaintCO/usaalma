import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspaceRoutes = readFileSync("lib/platform/workspaceRoutes.ts", "utf8");
const shellLabels = readFileSync("components/alma-shell/AlmaShell.tsx", "utf8");
const shellNav = readFileSync(
  "components/alma-shell/WorkspaceNavigation.tsx",
  "utf8",
);
const marketplaceService = readFileSync(
  "lib/platform/marketplace/catalog.service.ts",
  "utf8",
);
const marketplaceCopy = readFileSync(
  "components/marketplace/marketplaceCopy.ts",
  "utf8",
);
const marketplacePage = readFileSync("app/marketplace/page.tsx", "utf8");
const marketplaceCard = readFileSync(
  "components/marketplace/MarketplaceCatalogCard.tsx",
  "utf8",
);
const modulePlans = readFileSync("lib/modules/plans.ts", "utf8");
const repository = readFileSync(
  "lib/db/repositories/construction/construction.repository.ts",
  "utf8",
);
const migration = readFileSync(
  "supabase/migrations/20260715018000_alma_construction_workspace.sql",
  "utf8",
);
const docs = readFileSync(
  "docs/deployment/construction-blueprint-beta-audit.md",
  "utf8",
);
const constructionPage = readFileSync("app/construction/page.tsx", "utf8");

assert.match(workspaceRoutes, /construction: "\/construction"/);
assert.match(shellLabels, /construction: "Construction"/);
assert.match(shellLabels, /construction: "Construccion"/);
assert.match(shellLabels, /construction: "beta"/);
assert.match(shellNav, /itemKey="construction"/);
assert.match(shellNav, /icon=\{Hammer\}/);
assert.match(shellNav, /releaseFor\("construction", "beta"\)/);

assert.match(marketplaceService, /key: "construction"/);
assert.match(marketplaceService, /name: "Construction Blueprint"/);
assert.match(marketplaceService, /category: "Business"/);
assert.match(marketplaceService, /releaseStatus: "beta"/);
assert.match(marketplaceService, /WORKSPACE_ROUTES\.construction/);
assert.match(marketplaceService, /installKey: "construction"/);
assert.match(
  marketplaceService,
  /No automatic takeoff, OCR, or scale detection/,
);
assert.match(marketplaceService, /Measurements require field verification/);
assert.match(modulePlans, /"construction"/);
assert.match(marketplaceCopy, /localizeMarketplaceItem/);
assert.match(marketplaceCopy, /Sin takeoff automatico/);
assert.match(marketplacePage, /localizeMarketplaceItem/);
assert.match(marketplaceCard, /construction: Hammer/);

for (const required of [
  "construction_projects",
  "construction_plan_files",
  "construction_measurements",
  "construction_annotations",
  "construction_material_items",
  "construction_scope_sections",
  "construction_crew_instructions",
  "construction_export_records",
  "storage.buckets",
  "alma-construction",
  "public=false",
  "user_id=auth.uid()",
]) {
  assert.match(
    migration,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
}

for (const method of [
  "assertProject",
  "assertCanonicalReferences",
  "assertDocument",
  "assertPlanFile",
  "assertMeasurement",
  "assertMaterial",
  "createFileSignedUrl",
  "createExportSignedUrl",
  "getCompletedExportByIdempotencyKey",
]) {
  assert.match(repository, new RegExp(method));
}

assert.doesNotMatch(repository, /getPublicUrl/);
assert.match(constructionPage, /Estimates only/);
assert.match(constructionPage, /Not engineering or architectural advice/);
assert.match(constructionPage, /not an automated professional takeoff/i);

for (const requiredDoc of [
  "Release Scope",
  "Commit Chain",
  "20260715018000_alma_construction_workspace.sql",
  "alma-construction",
  "npx supabase db push --linked --dry-run",
  "npx supabase db push --linked",
  "npx supabase migration list --linked",
  "Two-User RLS Test Plan",
  "PDF Live Test",
  "Mobile Manual Test Checklist",
  "Beta Readiness Decision",
]) {
  assert.match(
    docs,
    new RegExp(requiredDoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
}

console.log("Construction Beta release checks passed.");
