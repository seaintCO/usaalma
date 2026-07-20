import { existsSync, readFileSync } from "node:fs";

const checks = [
  {
    file: "package.json",
    required: ['"e2b"', '"@openai/codex-sdk"'],
  },
  {
    file: "supabase/migrations/20260718009000_alma_builder_engine_1.sql",
    required: [
      "alma_claim_builder_job",
      "for update skip locked",
      "grant execute on function public.alma_claim_builder_job",
      "github_app",
      "github_app",
      "builder_jobs_one_active_project_idx",
      "retryable_failed",
      "permanently_failed",
    ],
    forbidden: ["using (true)", "with check (true)", " to anon"],
  },
  {
    file: "workers/builder/runOnce.ts",
    required: [
      "claimNextJob",
      "provisionWorkspace",
      "startSession",
      "runAllowedCommand",
      "validateBuilderPreviewUrl",
      "preview_ready",
    ],
    forbidden: ["child_process", "exec(", "spawn("],
  },
  {
    file: "lib/builder/providers/e2bWorkspace.provider.ts",
    required: [
      "Sandbox.create",
      "E2B_API_KEY",
      "ALMA_BUILDER_E2B_TEMPLATE",
      "COMMANDS",
      "BUILDER_WORKSPACE_PROVIDER_NOT_CONFIGURED",
      "redactBuilderSecrets",
    ],
    forbidden: ["req.body", "request.json"],
  },
  {
    file: "lib/builder/providers/codexCoding.provider.ts",
    required: [
      "Sandbox.connect",
      "codex exec --json",
      "ALMA_BUILDER_GATEWAY_TOKEN",
      "BUILDER_CODING_PROVIDER_NOT_CONFIGURED",
      "--ignore-user-config",
      "--ignore-rules",
      "Do not read, request, print, or write credentials.",
    ],
  },
  {
    file: "lib/builder/providers/e2bPreview.provider.ts",
    required: [
      "Sandbox.connect",
      "getHost",
      "validateBuilderPreviewUrl",
      "previewPort",
    ],
  },
  {
    file: "lib/builder/redaction.ts",
    required: [
      "authorization",
      "bearer",
      "cookie",
      "sk-",
      "github_pat",
      "PRIVATE KEY",
    ],
  },
  {
    file: "lib/connectors/types.ts",
    required: ["github_app"],
  },
  {
    file: "lib/connectors/config.ts",
    required: [
      "github_app",
      "GITHUB_APP_ID",
      "GITHUB_APP_CLIENT_ID",
      "GITHUB_APP_CLIENT_SECRET",
      "GITHUB_APP_PRIVATE_KEY",
      "GITHUB_WEBHOOK_SECRET",
      "GITHUB_APP_SLUG",
    ],
  },
  {
    file: "app/api/connectors/github/start/route.ts",
    required: ["createGitHubAppState", "github.com/apps", "installations/new"],
  },
  {
    file: "app/api/connectors/github/callback/route.ts",
    required: [
      "verifyGitHubAppState",
      "installation_id",
      "saveGitHubAppConnection",
    ],
  },
  {
    file: "lib/platform/actions/actionExecutorRegistry.ts",
    required: [
      "builder.repository.create",
      "builder.source.push",
      "getConnectedGitHubAppConnection",
      "No repository was created.",
    ],
  },
  {
    file: "app/api/builder/projects/[projectId]/sessions/route.ts",
    required: ["BuilderService.startSession", "starterKey", "revisionPrompt"],
    forbidden: ["child_process", "exec(", "spawn(", "E2B_API_KEY"],
  },
  {
    file: "app/api/builder/projects/[projectId]/github/route.ts",
    required: ["BuilderService.prepareGithubSave"],
    forbidden: ["child_process", "exec(", "spawn(", "GITHUB_APP_PRIVATE_KEY"],
  },
  {
    file: ".env.example",
    required: [
      "ALMA_BUILDER_ENGINE_ENABLED",
      "ALMA_BUILDER_WORKER_SECRET",
      "E2B_API_KEY",
      "ALMA_BUILDER_GATEWAY_URL",
      "ALMA_BUILDER_GATEWAY_SIGNING_KEY",
      "ALMA_BUILDER_CODEX_MODEL",
      "GITHUB_APP_ID",
      "GITHUB_APP_PRIVATE_KEY",
      "ALMA_BUILDER_PREVIEW_HOSTS",
    ],
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

const apiRoutes = [
  "app/api/builder/projects/route.ts",
  "app/api/builder/projects/[projectId]/route.ts",
  "app/api/builder/projects/[projectId]/sessions/route.ts",
  "app/api/builder/projects/[projectId]/github/route.ts",
  "app/api/builder/projects/[projectId]/cancel/route.ts",
];

for (const file of apiRoutes) {
  const source = readFileSync(file, "utf8");
  for (const forbidden of [
    "Sandbox.",
    "new Codex",
    "child_process",
    "process.env.E2B_API_KEY",
    "process.env.CODEX_API_KEY",
  ]) {
    if (source.includes(forbidden)) {
      console.error(
        `${file}: forbidden request-handler execution ${forbidden}`,
      );
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log("ALMA Builder Engine 1 checks passed.");
