import { existsSync, readFileSync } from "node:fs";

const checks = [
  {
    file: "lib/platform/workspaceRoutes.ts",
    required: ['builder: "/builder"'],
  },
  {
    file: "lib/platform/modules/registry.ts",
    required: [
      'key: "builder"',
      'entitlementKey: "builder"',
      "route: WORKSPACE_ROUTES.builder",
      'approvalPolicy: "always_protected"',
      "BUILDER_ENGINE_NOT_CONFIGURED",
    ],
  },
  {
    file: "lib/builder/types.ts",
    required: [
      "BUILDER_LIFECYCLE_STATES",
      "draft",
      "provisioning",
      "ready",
      "building",
      "validating",
      "awaiting_approval",
      "preview_ready",
      "blocked",
      "failed",
      "archived",
      "canTransitionBuilderProject",
    ],
  },
  {
    file: "lib/builder/providers.ts",
    required: [
      "CodingAgentProvider",
      "WorkspaceProvider",
      "SourceControlProvider",
      "PreviewProvider",
      "DeploymentProvider",
      "BuilderJobProvider",
      'status: "blocked"',
      "BUILDER_ENGINE_NOT_CONFIGURED",
      "builder.repository.create",
      "builder.workspace.provision",
      "builder.source.push",
      "builder.checkpoint.restore",
      "builder.preview.publish",
      "builder.deployment.create",
    ],
  },
  {
    file: "lib/builder/preview.ts",
    required: [
      "validateBuilderPreviewUrl",
      "ALMA_BUILDER_PREVIEW_HOSTS",
      'url.protocol !== "https:"',
      "allowedHosts.has(hostname)",
    ],
  },
  {
    file: "lib/builder/service.ts",
    required: [
      "resolveTenantWorkspace",
      "EntitlementService.checkModuleAccess",
      "builder_entitlement_required",
      "BuilderEngineRepository.createBuildJob",
      "prepareGithubSave",
    ],
  },
  {
    file: "lib/builder/repository.ts",
    required: [
      "idempotency_key",
      "BuilderRepository",
      "builder_schema_unavailable",
      'eq("user_id", input.userId)',
      "project_created",
      "project_archived",
    ],
  },
  {
    file: "lib/platform/actions/protectedActions.ts",
    required: [
      "PROTECTED_ACTION_DEFINITIONS",
      "builder.repository.create",
      "builder.workspace.provision",
      "builder.source.push",
      "builder.checkpoint.restore",
      "builder.preview.publish",
      "builder.deployment.create",
      "executable: false",
    ],
  },
  {
    file: "supabase/migrations/20260718008000_alma_builder_foundation.sql",
    required: [
      "create table if not exists public.builder_projects",
      "create table if not exists public.builder_sessions",
      "create table if not exists public.builder_events",
      "create table if not exists public.builder_checkpoints",
      "create table if not exists public.builder_artifacts",
      "create table if not exists public.builder_jobs",
      "enable row level security",
      "assert_builder_ownership",
      "builder_user_has_workspace",
      "auth.uid() = user_id",
      "unique(user_id, idempotency_key)",
    ],
    forbidden: [" to anon", " for anon", "using (true)", "with check (true)"],
  },
  {
    file: "app/api/builder/projects/route.ts",
    required: [
      "requireBuilderUser",
      "BuilderService.listProjects",
      "BuilderService.createDraft",
      "idempotencyKey",
    ],
  },
  {
    file: "app/api/builder/projects/[projectId]/sessions/route.ts",
    required: ["BuilderService.startSession"],
    forbidden: ["child_process", "exec(", "spawn(", "shell"],
  },
  {
    file: "app/builder/page.tsx",
    required: [
      "No Builder projects yet",
      "builder_schema_unavailable",
      "builder_entitlement_required",
    ],
    forbidden: ["fake", "mock project"],
  },
  {
    file: "app/builder/projects/[projectId]/page.tsx",
    required: [
      "validateBuilderPreviewUrl",
      'sandbox="allow-scripts allow-forms"',
      "Preview not available yet",
      "No code execution was started",
    ],
    forbidden: ["terminal animation", "fake progress"],
  },
  {
    file: "docs/alma-builder-architecture.md",
    required: ["Future Worker Plane", "BUILDER_ENGINE_NOT_CONFIGURED"],
  },
  {
    file: "docs/alma-builder-threat-model.md",
    required: ["Arbitrary-code execution", "SSRF", "Secret exfiltration"],
  },
  {
    file: "docs/alma-builder-provider-decision.md",
    required: ["codex exec", "Codex MCP", "Codex App Server"],
  },
];

let failed = false;

for (const check of checks) {
  if (!existsSync(check.file)) {
    console.error(`${check.file}: missing file`);
    failed = true;
    continue;
  }
  const source = readFileSync(check.file, "utf8");
  for (const needle of check.required ?? []) {
    if (!source.includes(needle)) {
      console.error(`${check.file}: missing ${needle}`);
      failed = true;
    }
  }
  for (const needle of check.forbidden ?? []) {
    if (source.includes(needle)) {
      console.error(`${check.file}: forbidden ${needle}`);
      failed = true;
    }
  }
}

const allApiRoutes = [
  "app/api/builder/projects/route.ts",
  "app/api/builder/projects/[projectId]/route.ts",
  "app/api/builder/projects/[projectId]/sessions/route.ts",
  "app/api/builder/projects/[projectId]/events/route.ts",
  "app/api/builder/projects/[projectId]/checkpoints/route.ts",
];

for (const file of allApiRoutes) {
  const source = readFileSync(file, "utf8");
  for (const forbidden of [
    "child_process",
    "execFile",
    "exec(",
    "spawn(",
    "process.env.OPENAI_API_KEY",
    "process.env.SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    if (source.includes(forbidden)) {
      console.error(
        `${file}: Builder API exposes forbidden runtime ${forbidden}`,
      );
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log("ALMA Builder foundation checks passed.");
