import fs from "node:fs";
import path from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const jiti = createJiti(import.meta.url);
const { shellMessages, notesMessages } = jiti("../lib/i18n/messages.ts");

function sameKeys(left, right, prefix) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  assert(
    JSON.stringify(leftKeys) === JSON.stringify(rightKeys),
    `${prefix} EN/ES keys differ.`,
  );
  for (const key of leftKeys) {
    assert(
      String(left[key]).trim() && String(right[key]).trim(),
      `${prefix}.${key} is empty.`,
    );
  }
}
sameKeys(shellMessages.en, shellMessages.es, "shell");
sameKeys(notesMessages.en, notesMessages.es, "notes");

const registry = read("lib/platform/modules/registry.ts");
const moduleIds = [...registry.matchAll(/^    key: "([^"]+)"/gm)].map(
  (match) => match[1],
);
assert(
  moduleIds.length === 21 && new Set(moduleIds).size === 21,
  "Canonical module registry coverage changed.",
);
const matrix = read("docs/alma-functional-app-matrix.md");
for (const moduleId of moduleIds)
  assert(
    new RegExp(`^\\|\\s*${moduleId}\\s*\\|`, "m").test(matrix),
    `Functional matrix is missing ${moduleId}.`,
  );

const routedModules = [
  ...registry.matchAll(
    /key: "([^"]+)"[\s\S]*?route: WORKSPACE_ROUTES\.([a-z_]+)/g,
  ),
];
for (const [, moduleId, routeKey] of routedModules) {
  const workspaceRoutes = read("lib/platform/workspaceRoutes.ts");
  const routeMatch = workspaceRoutes.match(
    new RegExp(`^\\s*${routeKey}:\\s*"([^"]+)"`, "m"),
  );
  assert(routeMatch, `Registry module ${moduleId} has no canonical route.`);
  const pagePath = `app${routeMatch[1]}/page.tsx`;
  assert(
    fs.existsSync(path.join(root, pagePath)),
    `${moduleId} route is missing ${pagePath}.`,
  );
}

const localeHook = read("lib/i18n/useAlmaLocale.ts");
const languageRoute = read("app/api/settings/language/route.ts");
assert(
  localeHook.includes("alma_locale") ||
    localeHook.includes("ALMA_LOCALE_COOKIE"),
  "Canonical locale cookie persistence is missing.",
);
assert(
  localeHook.includes("alma-language-change") &&
    languageRoute.includes("response.cookies.set"),
  "Server/client locale agreement is missing.",
);

const notes = read("app/notes/page.tsx");
assert(
  notes.includes("nextNotes[0] ?? null"),
  "Notes do not select the first visible note.",
);
assert(
  notes.includes("searchEmpty") && notes.includes("loadError"),
  "Notes empty and error states are not distinct.",
);
assert(
  notes.includes("window.confirm(copy.deleteConfirm)"),
  "Notes deletion confirmation is missing.",
);
assert(
  notes.includes('cache: "no-store"') && notes.includes('method: "PATCH"'),
  "Notes persistence contract is incomplete.",
);
assert(
  !notes.includes("lang.toUpperCase()"),
  "Malformed isolated Notes locale control returned.",
);
assert(
  read("lib/db/repositories/notes/note.repository.ts").includes(
    '.eq("user_id",userId)',
  ),
  "Notes ownership filter is missing.",
);

for (const [moduleId, pagePath] of [
  ["tasks", "app/tasks/page.tsx"],
  ["planner", "app/planner/page.tsx"],
]) {
  const source = read(pagePath);
  assert(
    source.includes("useAlmaLocale") && source.includes("window.confirm"),
    `${moduleId} lacks canonical locale synchronization or delete confirmation.`,
  );
  assert(
    source.includes('method: "PATCH"') && source.includes('method: "DELETE"'),
    `${moduleId} CRUD contract is incomplete.`,
  );
}

const documentsPage = read("app/documents/page.tsx");
const documentsDelete = read("app/api/documents/[documentId]/route.ts");
assert(
  documentsPage.includes("deleteDocument") &&
    documentsPage.includes("window.confirm(t.deleteConfirm)"),
  "Documents delete UX is incomplete.",
);
assert(
  documentsDelete.includes('.eq("user_id", user.id)') &&
    documentsDelete.includes('.from("alma-documents")') &&
    documentsDelete.includes("DOCUMENT_DELETE_FAILED"),
  "Documents owned metadata/storage deletion is incomplete.",
);

const workspacesPage = read("app/workspaces/page.tsx");
const workspaceInvite = read("app/api/workspaces/invite/route.ts");
assert(
  workspacesPage.includes("useAlmaLocale") &&
    workspacesPage.includes('activeWorkspace="workspaces"') &&
    workspacesPage.includes("if (!response.ok)"),
  "Workspaces bilingual truthful UI contract is incomplete.",
);
assert(
  workspaceInvite.includes("resolveTenantWorkspace") &&
    workspaceInvite.includes('tenant.source !== "workspace_owner"') &&
    workspaceInvite.includes("WORKSPACE_OWNER_REQUIRED"),
  "Workspace invitations do not enforce owner authority.",
);

for (const pagePath of [
  "app/dashboard/apps/page.tsx",
  "app/marketplace/page.tsx",
  "app/approvals/page.tsx",
  "app/connections/page.tsx",
  "app/settings/page.tsx",
  "app/office/page.tsx",
  "app/communications/page.tsx",
  "app/translator/page.tsx",
  "app/fitness/page.tsx",
  "app/images/page.tsx",
  "app/creative/page.tsx",
  "app/launch-studio/page.tsx",
  "app/trader/page.tsx",
  "app/builder/page.tsx",
  "app/builder/new/page.tsx",
  "app/agents/page.tsx",
  "app/dashboard/page.tsx",
  "app/crm/page.tsx",
  "app/invoicing/page.tsx",
  "app/construction/page.tsx",
]) {
  assert(
    read(pagePath).includes("useAlmaLocale"),
    `${pagePath} is not synchronized to the canonical locale.`,
  );
}

const UI_LITERAL_ALLOWLIST = new Set(["ALMA"]);
for (const pagePath of [
  "app/tasks/page.tsx",
  "app/planner/page.tsx",
  "app/notes/page.tsx",
  "app/documents/page.tsx",
  "app/workspaces/page.tsx",
]) {
  const candidates = [
    ...read(pagePath).matchAll(/>\s*([A-Za-z][A-Za-z ]{2,})\s*</g),
  ]
    .map((match) => match[1].trim())
    .filter((literal) => !UI_LITERAL_ALLOWLIST.has(literal));
  assert(
    candidates.length === 0,
    `${pagePath} contains untranslated JSX literals: ${candidates.join(", ")}`,
  );
}

const clientFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      read(path.relative(root, target)).startsWith('"use client"')
    )
      clientFiles.push(target);
  }
}
walk(path.join(root, "app"));
walk(path.join(root, "components"));
walk(path.join(root, "lib"));
for (const file of clientFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert(
    !/(SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|E2B_API_KEY|GATEWAY_SIGNING_KEY)/.test(
      source,
    ),
    `Client file references a server secret: ${path.relative(root, file)}`,
  );
}

const oauthLegacy = read("app/api/oauth/connect/route.ts");
assert(
  oauthLegacy.includes("legacy_mock_connection_disabled") &&
    !oauthLegacy.includes("mockConnect"),
  "Legacy OAuth still reports fake connection success.",
);
const approvals = `${read("lib/platform/approvals/types.ts")}\n${registry}`;
assert(
  approvals.includes("always_protected") &&
    approvals.includes("approval_required"),
  "Approval boundary types are missing.",
);

const builder = read("app/builder/projects/[projectId]/page.tsx");
assert(
  builder.includes('sandbox="allow-scripts allow-forms"') &&
    builder.includes('referrerPolicy="no-referrer"'),
  "Builder iframe security changed.",
);
assert(
  builder.includes("BUILDER_STAGE_ES") && builder.includes("useAlmaLocale"),
  "Builder EN/ES stages are missing.",
);
assert(
  builder.includes("Advanced Design and Code inspection require desktop"),
  "Builder mobile fallback is missing.",
);
assert(
  read("lib/platform/app-navigation/service.ts").includes(
    "resolveTenantWorkspace",
  ),
  "App navigation workspace isolation is missing.",
);
assert(
  read("lib/platform/app-navigation/service.ts").includes("EntitlementService"),
  "App navigation entitlement enforcement is missing.",
);

process.stdout.write(
  JSON.stringify(
    {
      ok: true,
      code: "ALMA_MILESTONE7_CHECK_PASSED",
      moduleRegistryCoverage: moduleIds.length,
      dictionaries: ["shell", "notes"],
      clientFilesScanned: clientFiles.length,
      externalRequests: false,
    },
    null,
    2,
  ) + "\n",
);
