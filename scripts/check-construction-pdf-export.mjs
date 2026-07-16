import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/construction/page.tsx", "utf8");
const summary = readFileSync(
  "components/construction/ConstructionSummary.tsx",
  "utf8",
);
const pdf = readFileSync("lib/construction/pdf.ts", "utf8");
const repository = readFileSync(
  "lib/db/repositories/construction/construction.repository.ts",
  "utf8",
);
const listRoute = readFileSync(
  "app/api/construction/projects/[id]/exports/route.ts",
  "utf8",
);
const generateRoute = readFileSync(
  "app/api/construction/projects/[id]/exports/pdf/route.ts",
  "utf8",
);
const downloadRoute = readFileSync(
  "app/api/construction/projects/[id]/exports/[exportId]/download/route.ts",
  "utf8",
);

assert.match(page, /<ConstructionSummary/);
assert.match(summary, /generatePdf/);
assert.match(summary, /downloadExport/);
assert.match(summary, /exportHistory/);
assert.match(
  summary,
  /\/api\/construction\/projects\/\$\{projectId\}\/exports\/pdf/,
);
assert.match(
  summary,
  /\/api\/construction\/projects\/\$\{projectId\}\/exports\/\$\{record\.id\}\/download/,
);

assert.match(pdf, /new jsPDF/);
assert.match(pdf, /ALMA Construction Summary/);
assert.match(pdf, /Company|Project|Customer|Jobsite/);
assert.match(pdf, /Measurements/);
assert.match(pdf, /Materials/);
assert.match(pdf, /Scope/);
assert.match(pdf, /Crew Instructions/);
assert.match(pdf, /Disclaimers/);
assert.match(pdf, /addPageNumbers/);
assert.match(pdf, /addImage/);
assert.match(pdf, /Estimate only/);
assert.match(pdf, /Not engineering advice or code compliance/);

assert.match(repository, /construction_export_records/);
assert.match(repository, /listExports/);
assert.match(repository, /getCompletedExportByIdempotencyKey/);
assert.match(repository, /createExportRecord/);
assert.match(repository, /completeExportRecord/);
assert.match(repository, /failExportRecord/);
assert.match(repository, /uploadExportPdf/);
assert.match(repository, /createExportSignedUrl/);
assert.match(repository, /downloadPlanFileBlob/);
assert.match(repository, /\/exports\/\$\{crypto\.randomUUID\(\)\}-/);
assert.match(repository, /createSignedUrl/);
assert.doesNotMatch(repository, /getPublicUrl/);

assert.match(listRoute, /listExports/);
assert.match(generateRoute, /createConstructionPdf/);
assert.match(generateRoute, /getCompletedExportByIdempotencyKey/);
assert.match(generateRoute, /uploadExportPdf/);
assert.match(downloadRoute, /createExportSignedUrl/);

for (const forbidden of [
  "OCR",
  "automatic takeoff",
  "scale detection",
  "supplier pricing",
  "CAD",
  "BIM",
  "collaboration",
]) {
  assert.equal(
    generateRoute.includes(forbidden),
    false,
    `${forbidden} not in export route`,
  );
  assert.equal(
    pdf.includes(forbidden),
    false,
    `${forbidden} not in pdf renderer`,
  );
}

console.log("Construction PDF export checks passed.");
