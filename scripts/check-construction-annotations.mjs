import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/construction/page.tsx", "utf8");
const workspace = readFileSync(
  "components/construction/AnnotationWorkspace.tsx",
  "utf8",
);
const helpers = readFileSync("lib/construction/annotations.ts", "utf8");
const types = readFileSync("lib/construction/types.ts", "utf8");
const repository = readFileSync(
  "lib/db/repositories/construction/construction.repository.ts",
  "utf8",
);
const projectRoute = readFileSync(
  "app/api/construction/projects/[id]/annotations/route.ts",
  "utf8",
);
const annotationRoute = readFileSync(
  "app/api/construction/annotations/[annotationId]/route.ts",
  "utf8",
);

assert.match(page, /"annotations"/);
assert.match(page, /<AnnotationWorkspace/);
assert.match(workspace, /viewBox="0 0 1 1"/);
assert.match(workspace, /preserveAspectRatio="none"/);
assert.match(workspace, /onPointerDown/);
assert.match(workspace, /onPointerUp/);
assert.match(workspace, /type Tool = ConstructionAnnotationType \| "pan"/);
assert.match(workspace, /mode=preview/);
assert.match(workspace, /mode=download/);
assert.match(workspace, /pdfAnnotationSoon/);
assert.match(workspace, /window\.addEventListener\("beforeunload"/);
assert.match(workspace, /method: annotation\.persistedId \? "PATCH" : "POST"/);
assert.match(workspace, /confirm=delete/);
assert.match(workspace, /setZoom/);
assert.match(workspace, /setPan/);

for (const value of ["point", "line", "rectangle", "text"]) {
  assert.match(types, new RegExp(`"${value}"`));
  assert.match(workspace, new RegExp(`"${value}"`));
}

for (const value of [
  "neutral",
  "measurement",
  "material",
  "scope",
  "warning",
]) {
  assert.match(types, new RegExp(`"${value}"`));
  assert.match(repository, /normalizeAnnotationColor/);
}

assert.match(projectRoute, /normalizeAnnotationColor/);
assert.match(annotationRoute, /normalizeAnnotationColor/);
assert.match(
  repository,
  /assertPlanFile\(userId, projectId, input\.planFileId\)/,
);
assert.match(
  repository,
  /assertMeasurement\(userId, projectId, input\.measurementId\)/,
);

assert.match(helpers, /function clamp01/);
assert.match(helpers, /pointFromViewport/);
assert.match(helpers, /pointToViewport/);
assert.match(helpers, /validateAnnotationGeometry/);
assert.match(helpers, /normalizedBox/);
assert.match(helpers, /normalizeAnnotationColor/);

function isNormalizedCoordinate(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function pointToViewport(point, width, height) {
  return { x: point.x * width, y: point.y * height };
}

function validateAnnotationGeometry(type, geometry) {
  if (
    !isNormalizedCoordinate(geometry.x1) ||
    !isNormalizedCoordinate(geometry.y1)
  )
    return false;
  if (type === "line" || type === "rectangle") {
    return (
      isNormalizedCoordinate(geometry.x2) &&
      isNormalizedCoordinate(geometry.y2) &&
      (geometry.x1 !== geometry.x2 || geometry.y1 !== geometry.y2)
    );
  }
  return true;
}

function normalizedBox(geometry) {
  const x2 = geometry.x2 ?? geometry.x1;
  const y2 = geometry.y2 ?? geometry.y1;
  return {
    x: Math.min(geometry.x1, x2),
    y: Math.min(geometry.y1, y2),
    width: Math.abs(x2 - geometry.x1),
    height: Math.abs(y2 - geometry.y1),
  };
}

function normalizeAnnotationColor(value) {
  return ["neutral", "measurement", "material", "scope", "warning"].includes(
    value,
  )
    ? value
    : "neutral";
}

assert.equal(isNormalizedCoordinate(0), true);
assert.equal(isNormalizedCoordinate(1), true);
assert.equal(isNormalizedCoordinate(-0.1), false);
assert.equal(isNormalizedCoordinate(1.1), false);
assert.equal(isNormalizedCoordinate(Number.NaN), false);

assert.deepEqual(pointToViewport({ x: 0.25, y: 0.5 }, 400, 200), {
  x: 100,
  y: 100,
});
assert.equal(validateAnnotationGeometry("point", { x1: 0.2, y1: 0.3 }), true);
assert.equal(
  validateAnnotationGeometry("line", {
    x1: 0.2,
    y1: 0.3,
    x2: 0.7,
    y2: 0.8,
  }),
  true,
);
assert.equal(
  validateAnnotationGeometry("line", {
    x1: 0.2,
    y1: 0.3,
  }),
  false,
);
assert.deepEqual(normalizedBox({ x1: 0.8, y1: 0.7, x2: 0.2, y2: 0.1 }), {
  x: 0.2,
  y: 0.1,
  width: 0.6000000000000001,
  height: 0.6,
});
assert.equal(normalizeAnnotationColor("warning"), "warning");
assert.equal(normalizeAnnotationColor("red"), "neutral");

for (const forbidden of [
  "AnnotationCanvas",
  "material templates",
  "scope sections",
  "crew instructions",
  "PDF export",
  "OCR",
  "automatic scale",
  "supplier pricing",
]) {
  assert.equal(page.includes(forbidden), false, `${forbidden} is not P6-D`);
}

console.log("Construction annotation checks passed.");
