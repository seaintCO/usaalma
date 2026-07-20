import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runtime = read("lib/runtime/readiness.ts");
const serverConfig = read("lib/runtime/config.ts");
const publicConfig = read("lib/runtime/publicConfig.ts");
const streamRoute = read("app/api/chat/stream/route.ts");
const chatUi = read("components/dashboard-chat/ChatWorkspace.tsx");
const navigationApi = read("app/api/app-navigation/route.ts");
const navigationService = read("lib/platform/app-navigation/service.ts");
const navigationMigration = read(
  "supabase/migrations/20260720001000_alma_app_navigation_preferences.sql",
);
const navigationUi = read("components/alma-shell/WorkspaceNavigation.tsx");
const appsUi = read("app/dashboard/apps/page.tsx");
const builderUi = read("app/builder/projects/[projectId]/page.tsx");
const previewValidator = read("lib/builder/preview.ts");

assert(
  serverConfig.includes('import "server-only"'),
  "Server configuration is not marked server-only.",
);
assert(
  !publicConfig.includes("SERVICE_ROLE") &&
    !publicConfig.includes("OPENAI_API_KEY"),
  "Public configuration references a server secret.",
);
assert(
  runtime.includes('"supabase-service-role"') &&
    runtime.includes('"builder-worker"'),
  "Canonical readiness capabilities are incomplete.",
);
assert(
  streamRoute.includes("ALMA_ERROR") && chatUi.includes("streamErrorMarker"),
  "Structured terminal chat failure handling is missing.",
);
assert(
  chatUi.includes("retry: terminalStreamError ? retry"),
  "Streaming failure Retry wiring is missing.",
);

assert(
  navigationApi.includes("getCurrentUser"),
  "App navigation API is not authenticated.",
);
assert(
  navigationService.includes("resolveAlmaModuleKey") &&
    navigationService.includes("EntitlementService"),
  "App pinning does not enforce registry and entitlement checks.",
);
assert(
  navigationService.includes("resolveTenantWorkspace"),
  "App pinning does not resolve workspace ownership.",
);
assert(
  navigationMigration.includes("enable row level security") &&
    navigationMigration.includes("alma_assert_platform_workspace_ownership"),
  "App navigation migration lacks RLS or workspace ownership checks.",
);
assert(
  navigationMigration.includes("display_order") &&
    navigationMigration.includes("unique index"),
  "App ordering or uniqueness is missing.",
);
assert(
  navigationUi.includes("max-h-60") && navigationUi.includes("View all apps"),
  "Bounded My Apps navigation is missing.",
);
assert(
  appsUi.includes("Add to sidebar") && appsUi.includes("Remove from sidebar"),
  "Apps pin and unpin controls are missing.",
);

assert(
  builderUi.includes("/events") &&
    builderUi.includes("/checkpoints") &&
    builderUi.includes("/sessions") &&
    builderUi.includes("/cancel"),
  "Builder workbench is not wired to persisted runtime APIs.",
);
assert(
  builderUi.includes('sandbox="allow-scripts allow-forms"'),
  "Builder iframe sandbox contract changed.",
);
assert(
  builderUi.includes('referrerPolicy="no-referrer"'),
  "Builder iframe referrer protection is missing.",
);
assert(
  builderUi.includes("validateBuilderPreviewUrl"),
  "Builder preview URL validation is missing.",
);
assert(
  previewValidator.includes("ALMA_BUILDER_PREVIEW_HOSTS"),
  "Preview allowlist configuration is missing.",
);
assert(
  builderUi.includes("Preview expired") && builderUi.includes("Build failed"),
  "Builder terminal preview states are incomplete.",
);
assert(
  builderUi.includes("Advanced Design and Code inspection require desktop"),
  "Mobile Builder fallback is missing.",
);
assert(
  builderUi.includes("Source viewer unavailable") &&
    !builderUi.includes("fake"),
  "Builder code mode must fail closed without a safe artifact API.",
);

process.stdout.write(
  JSON.stringify(
    {
      ok: true,
      code: "ALMA_MILESTONE6_CONTRACT_CHECK_PASSED",
      checks: {
        runtimeConfiguration: true,
        structuredChatFailure: true,
        appNavigationOwnership: true,
        appNavigationEntitlements: true,
        builderRuntimeWiring: true,
        previewIsolation: true,
        mobileFallback: true,
      },
      externalRequests: false,
    },
    null,
    2,
  ) + "\n",
);
