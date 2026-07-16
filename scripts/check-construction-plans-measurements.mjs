import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/construction/page.tsx", "utf8");
const fileUpload = readFileSync(
  "components/construction/FileUpload.tsx",
  "utf8",
);
const measurementUi = readFileSync(
  "components/construction/MeasurementCalculator.tsx",
  "utf8",
);
const fileRoute = readFileSync(
  "app/api/construction/files/[fileId]/route.ts",
  "utf8",
);
const projectFilesRoute = readFileSync(
  "app/api/construction/projects/[id]/files/route.ts",
  "utf8",
);
const repository = readFileSync(
  "lib/db/repositories/construction/construction.repository.ts",
  "utf8",
);
const types = readFileSync("lib/construction/types.ts", "utf8");
const calculations = await import("../lib/construction/calculations.ts");

assert.match(types, /"application\/pdf"/);
assert.match(types, /"image\/png"/);
assert.match(types, /"image\/jpeg"/);
assert.match(types, /25 \* 1024 \* 1024/);
assert.match(types, /15 \* 1024 \* 1024/);
assert.match(projectFilesRoute, /request\.formData\(\)/);
assert.match(repository, /constructionFileLimits/);
assert.match(repository, /alma-construction/);
assert.match(repository, /createSignedUrl/);
assert.match(repository, /mode: "preview" \| "download"/);
assert.match(fileRoute, /mode.*download/s);
assert.match(fileRoute, /confirm.*delete/s);
assert.match(fileUpload, /type="file"/);
assert.match(fileUpload, /className="hidden"/);
assert.match(fileUpload, /capture="environment"/);
assert.match(fileUpload, /confirm=delete/);
assert.match(fileUpload, /mode=preview/);
assert.match(fileUpload, /openFile\(file, "download"\)/);
assert.match(fileUpload, /window\.open/);
assert.match(page, /<FileUpload/);
assert.match(page, /<MeasurementCalculator/);
assert.match(measurementUi, /visibleDimensions/);
assert.match(measurementUi, /inputMode="decimal"/);
assert.match(measurementUi, /confirm=delete/);
assert.match(
  measurementUi,
  /\/api\/construction\/projects\/\$\{projectId\}\/measurements/,
);
assert.match(
  measurementUi,
  /\/api\/construction\/measurements\/\$\{draft\.id\}/,
);

for (const forbidden of [
  "AnnotationCanvas",
  "supplier pricing",
  "automatic scale",
  "OCR",
]) {
  assert.equal(page.includes(forbidden), false, `${forbidden} is not P6-C`);
}

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

assert.throws(() =>
  calculations.calculateMeasurement({
    measurementType: "linear",
    length: 0,
    quantity: 1,
    unit: "feet",
  }),
);
assert.throws(() =>
  calculations.calculateMeasurement({
    measurementType: "linear",
    length: -1,
    quantity: 1,
    unit: "feet",
  }),
);
assert.throws(() =>
  calculations.calculateMeasurement({
    measurementType: "area",
    length: 10,
    quantity: 1,
    unit: "square_feet",
  }),
);
assert.throws(() =>
  calculations.calculateMeasurement({
    measurementType: "volume",
    length: 10,
    width: 10,
    heightOrDepth: Number.POSITIVE_INFINITY,
    quantity: 1,
    unit: "cubic_feet",
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

assert.equal(calculations.convertUnit(24, "inches", "feet"), 2);
assert.equal(calculations.convertUnit(3, "feet", "yards"), 1);
assert.equal(calculations.convertUnit(3, "yards", "feet"), 9);
assert.equal(calculations.convertUnit(9, "square_feet", "square_yards"), 1);
assert.equal(calculations.convertUnit(2, "square_yards", "square_feet"), 18);
assert.equal(calculations.convertUnit(27, "cubic_feet", "cubic_yards"), 1);
assert.equal(calculations.convertUnit(2, "cubic_yards", "cubic_feet"), 54);
assert.throws(() => calculations.convertUnit(1, "feet", "square_feet"));
assert.throws(() => calculations.convertUnit(1, "square_feet", "cubic_feet"));

console.log("Construction plans and measurements checks passed.");
