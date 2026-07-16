import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260715018000_alma_construction_workspace.sql",
  "utf8",
);

for (const table of [
  "construction_projects",
  "construction_plan_files",
  "construction_measurements",
  "construction_material_templates",
  "construction_material_items",
  "construction_annotations",
  "construction_scope_sections",
  "construction_crew_instructions",
  "construction_export_records",
]) {
  assert.match(
    migration,
    new RegExp(`create table if not exists public\\.${table}`),
  );
  assert.match(
    migration,
    new RegExp(`alter table public\\.${table} enable row level security`),
  );
}

assert.match(migration, /alma-construction/);
assert.match(migration, /storage\.buckets/);
assert.match(migration, /Users manage own alma construction files/);
assert.match(migration, /validate_construction_project_refs/);
assert.match(migration, /validate_construction_child_refs/);

const calculations = await import("../lib/construction/calculations.ts");

assert.deepEqual(
  calculations.calculateMeasurement({
    measurementType: "linear",
    length: 12,
    quantity: 2,
    unit: "feet",
    wastePercentage: 10,
  }),
  { baseTotal: 24, adjustedTotal: 26.4, unit: "feet" },
);

assert.deepEqual(
  calculations.calculateMeasurement({
    measurementType: "area",
    length: 10,
    width: 8,
    quantity: 2,
    unit: "square_feet",
    wastePercentage: 5,
  }),
  { baseTotal: 160, adjustedTotal: 168, unit: "square_feet" },
);

assert.deepEqual(
  calculations.calculateMeasurement({
    measurementType: "volume",
    length: 2,
    width: 3,
    heightOrDepth: 4,
    quantity: 2,
    unit: "cubic_feet",
  }),
  { baseTotal: 48, adjustedTotal: 48, unit: "cubic_feet" },
);

assert.deepEqual(
  calculations.calculateMeasurement({
    measurementType: "perimeter",
    length: 10,
    width: 4,
    quantity: 3,
    unit: "feet",
  }),
  { baseTotal: 84, adjustedTotal: 84, unit: "feet" },
);

assert.deepEqual(
  calculations.calculateMeasurement({
    measurementType: "count",
    quantity: 7,
    unit: "each",
    wastePercentage: 10,
  }),
  { baseTotal: 7, adjustedTotal: 7.7, unit: "each" },
);

assert.equal(calculations.convertUnit(24, "inches", "feet"), 2);
assert.equal(calculations.convertUnit(3, "yards", "feet"), 9);
assert.equal(calculations.convertUnit(2, "square_yards", "square_feet"), 18);
assert.equal(calculations.convertUnit(2, "cubic_yards", "cubic_feet"), 54);

assert.throws(() => calculations.convertUnit(1, "feet", "square_feet"));
assert.throws(() =>
  calculations.calculateMeasurement({
    measurementType: "linear",
    length: -1,
    unit: "feet",
  }),
);
assert.throws(() =>
  calculations.calculateMeasurement({
    measurementType: "area",
    length: 10,
    width: 10,
    quantity: 1,
    unit: "feet",
  }),
);

console.log("Construction foundation checks passed.");
