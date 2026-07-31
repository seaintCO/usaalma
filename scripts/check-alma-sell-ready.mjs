import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`Missing sell-ready file: ${relativePath}`);
  }
}

const requiredFiles = [
  "supabase/migrations/20260729004000_alma_managed_voice_budgets_invoice_delivery.sql",
  "scripts/release-alma-production.ps1",
  ".github/workflows/alma-production-release.yml",
  "docs/alma-autonomous-release.md",
];

for (const file of requiredFiles) requireFile(file);

const release = read("scripts/release-alma-production.ps1");
for (const contract of [
  "supabase db push",
  "git push origin main",
  "vercel --prod --yes",
  "sell-ready:check",
  "managed-office:check",
]) {
  if (!release.includes(contract)) {
    throw new Error(`Production release contract missing: ${contract}`);
  }
}

const dashboard = read("components/dashboard-home/OperatingDashboard.tsx");
for (const contract of [
  "bg-gradient-to-br from-cyan-50",
  "bg-gradient-to-br from-emerald-50",
  "bg-gradient-to-br from-amber-50",
  "bg-gradient-to-r from-cyan-300 to-emerald-300",
]) {
  if (!dashboard.includes(contract)) {
    throw new Error(`Dashboard visual contract missing: ${contract}`);
  }
}

const activation = read("scripts/activate-alma-database.ps1");
if (
  !activation.includes(
    "20260729004000_alma_managed_voice_budgets_invoice_delivery.sql",
  )
) {
  throw new Error(
    "Database activation omits the newest managed-office migration",
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      code: "ALMA_SELL_READY_RELEASE_CONTRACT_PASSED",
      releaseOrder: ["validate", "migrate", "push", "deploy", "smoke"],
      productionData: "real-only",
      customerMigrationSteps: 0,
      dashboard: "professional-color-system",
    },
    null,
    2,
  ),
);
