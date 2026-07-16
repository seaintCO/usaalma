import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/construction/page.tsx", "utf8");
const routes = readFileSync("lib/platform/workspaceRoutes.ts", "utf8");
const shell = readFileSync(
  "components/alma-shell/WorkspaceNavigation.tsx",
  "utf8",
);

assert.match(routes, /construction:\s*"\/construction"/);
assert.match(shell, /itemKey="construction"/);
assert.match(shell, /releaseFor\("construction", "beta"\)/);
assert.match(page, /activeWorkspace="construction"/);
assert.match(page, /\/api\/construction\/projects/);
assert.match(page, /\/api\/crm\/summary/);
assert.match(page, /confirm=delete/);
assert.match(page, /Available in the next Construction checkpoint/);

for (const forbidden of [
  "OCR",
  "automatic scale",
  "supplier pricing",
  "/api/construction/projects/[id]/files",
  "PDF export",
]) {
  assert.equal(
    page.includes(forbidden),
    false,
    `P6-B page should not include ${forbidden}`,
  );
}

console.log("Construction project workspace checks passed.");
