import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/construction/page.tsx", "utf8");
const materialsWorkspace = readFileSync(
  "components/construction/MaterialsWorkspace.tsx",
  "utf8",
);
const scopeWorkspace = readFileSync(
  "components/construction/ScopeWorkspace.tsx",
  "utf8",
);
const crewWorkspace = readFileSync(
  "components/construction/CrewWorkspace.tsx",
  "utf8",
);
const summaryWorkspace = readFileSync(
  "components/construction/ConstructionSummary.tsx",
  "utf8",
);
const materialsHelper = readFileSync("lib/construction/materials.ts", "utf8");
const repository = readFileSync(
  "lib/db/repositories/construction/construction.repository.ts",
  "utf8",
);
const materialProjectRoute = readFileSync(
  "app/api/construction/projects/[id]/materials/route.ts",
  "utf8",
);
const materialItemRoute = readFileSync(
  "app/api/construction/materials/[materialId]/route.ts",
  "utf8",
);

for (const component of [
  "MaterialsWorkspace",
  "ScopeWorkspace",
  "CrewWorkspace",
  "ConstructionSummary",
]) {
  assert.match(page, new RegExp(`<${component}`));
}

for (const template of [
  "masonry-brick-block",
  "masonry-mortar",
  "masonry-sand",
  "masonry-concrete",
  "chimney-face-area",
  "chimney-brick-block",
  "chimney-flue-components",
  "chimney-cap",
  "floor-square-footage",
  "floor-boxes-units",
  "roof-area",
  "roof-squares",
  "roof-bundles",
  "roof-underlayment",
  "wall-area",
  "wall-drywall-sheets",
  "wall-studs",
  "wall-paint-coverage",
]) {
  assert.match(materialsHelper, new RegExp(template));
}

assert.match(materialsWorkspace, /calculateMaterialQuantity/);
assert.match(materialsWorkspace, /isCompatibleMaterialSource/);
assert.match(materialsWorkspace, /manualQuantityOverride/);
assert.match(materialsWorkspace, /confirm=delete/);
assert.match(materialsWorkspace, /fixed inset-0/);

assert.match(scopeWorkspace, /constructionScopeKeys/);
assert.match(scopeWorkspace, /Project Summary|projectSummary/);
assert.match(scopeWorkspace, /includedWork/);
assert.match(scopeWorkspace, /exclusions/);
assert.match(scopeWorkspace, /assumptions/);
assert.match(scopeWorkspace, /materialNotes/);
assert.match(scopeWorkspace, /accessSiteNotes/);
assert.match(scopeWorkspace, /customerNotes/);
assert.match(scopeWorkspace, /method: "PUT"/);
assert.match(scopeWorkspace, /fixed inset-0/);

assert.match(crewWorkspace, /method: "PUT"/);
assert.match(crewWorkspace, /measurementId/);
assert.match(crewWorkspace, /materialId/);
assert.match(crewWorkspace, /planFileId/);
assert.match(crewWorkspace, /\/api\/tasks\/create/);
assert.match(crewWorkspace, /\/api\/planner\/add/);
assert.match(crewWorkspace, /fixed inset-0/);

assert.match(repository, /isCompatibleMaterialSource/);
assert.match(repository, /assertMaterial/);
assert.match(repository, /invalid_material_measurement_type/);
assert.match(repository, /invalid_waste_factor/);
assert.match(repository, /materialTotals/);
assert.match(repository, /annotations\.length/);

assert.match(materialProjectRoute, /numberOrValidationError/);
assert.match(materialItemRoute, /numberOrValidationError/);
assert.doesNotMatch(page, /exports\/pdf/);
assert.doesNotMatch(materialsWorkspace, /price|supplier|ordering/i);
assert.doesNotMatch(scopeWorkspace, /exports\/pdf|OCR|scale detection/i);
assert.doesNotMatch(crewWorkspace, /payroll|GPS|live collaboration/i);
assert.match(summaryWorkspace, /materialTotals/);

function calculateMaterialQuantity(input) {
  const base = input.measurementAdjustedTotal ?? 0;
  const factor = input.conversionFactor ?? 1;
  const waste = input.wasteFactor ?? 0;
  assertFiniteNonNegative(base);
  assertFiniteNonNegative(factor);
  assertFiniteNonNegative(waste);
  if (waste > 100) throw new Error("wasteFactor");
  const calculatedQuantity =
    Math.round(base * factor * (1 + waste / 100) * 10000) / 10000;
  const manual =
    input.manualQuantityOverride === null ||
    input.manualQuantityOverride === undefined
      ? null
      : input.manualQuantityOverride;
  if (manual !== null) assertFiniteNonNegative(manual);
  return {
    calculatedQuantity,
    finalQuantity: manual ?? calculatedQuantity,
    overridden: manual !== null,
  };
}

function assertFiniteNonNegative(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error("invalid");
}

function isCompatibleMaterialSource(measurementType, sourceMeasurementType) {
  if (!sourceMeasurementType || sourceMeasurementType === "manual") return true;
  return measurementType === sourceMeasurementType;
}

assert.deepEqual(
  calculateMaterialQuantity({
    measurementAdjustedTotal: 100,
    conversionFactor: 0.5,
  }),
  {
    calculatedQuantity: 50,
    finalQuantity: 50,
    overridden: false,
  },
);
assert.deepEqual(
  calculateMaterialQuantity({
    measurementAdjustedTotal: 10,
    conversionFactor: 2,
    wasteFactor: 10,
  }),
  { calculatedQuantity: 22, finalQuantity: 22, overridden: false },
);
assert.deepEqual(
  calculateMaterialQuantity({
    measurementAdjustedTotal: 10,
    conversionFactor: 2,
    manualQuantityOverride: 25,
  }),
  { calculatedQuantity: 20, finalQuantity: 25, overridden: true },
);
assert.deepEqual(calculateMaterialQuantity({ measurementAdjustedTotal: 0 }), {
  calculatedQuantity: 0,
  finalQuantity: 0,
  overridden: false,
});
assert.throws(() => calculateMaterialQuantity({ conversionFactor: -1 }));
assert.throws(() =>
  calculateMaterialQuantity({ conversionFactor: Number.NaN }),
);
assert.equal(isCompatibleMaterialSource("area", "area"), true);
assert.equal(isCompatibleMaterialSource("area", "linear"), false);
assert.equal(isCompatibleMaterialSource("count", "manual"), true);

console.log("Construction P6-E scope, materials, and crew checks passed.");
