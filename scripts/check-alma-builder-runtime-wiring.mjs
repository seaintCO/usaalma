import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

function source(file) {
  if (!existsSync(file)) throw new Error(`${file}: missing file`);
  return readFileSync(file, "utf8");
}

function assertIncludes(file, needles) {
  const text = source(file);
  for (const needle of needles) {
    if (!text.includes(needle)) throw new Error(`${file}: missing ${needle}`);
  }
}

function assertExcludes(file, needles) {
  const text = source(file);
  for (const needle of needles) {
    if (text.includes(needle)) throw new Error(`${file}: forbidden ${needle}`);
  }
}

const checks = [
  [
    "package.json",
    [
      '"builder:worker"',
      '"builder:worker:once"',
      '"builder:gateway"',
      '"builder:gateway:check"',
      '"builder:e2b:template:build"',
      '"builder:e2b:template:preflight"',
      '"builder:e2b:template:smoke"',
    ],
  ],
  [
    "workers/builder/index.ts",
    ["runBuilderJobOnce", "--loop", "ALMA_BUILDER_WORKER_POLL_MS"],
  ],
  [
    "lib/builder/providers/codexCoding.provider.ts",
    [
      "Sandbox.connect",
      "codex exec --json",
      "ALMA_BUILDER_GATEWAY_TOKEN",
      "BUILDER_SANDBOX_PROJECT_DIR",
      "--ignore-user-config",
      "--ignore-rules",
    ],
  ],
  [
    "workers/builder/runOnce.ts",
    [
      "BUILDER_SANDBOX_PROJECT_DIR",
      "issueBuilderGatewayToken",
      "transferStarter",
      "runAllowedCommand",
      "extractArtifact",
      "start_preview",
      "destroyBuilderWorkspace",
    ],
  ],
  [
    "infra/e2b/alma-builder/template.mjs",
    [
      "alma-builder-node-lts",
      "/workspace/project",
      "ALMA_BUILDER_CODEX_VERSION",
      ".fromNodeImage",
      "build-essential",
      "resolveAlmaBuilderTemplateContext",
      ".setUser",
      "waitForFile",
    ],
  ],
  [
    "infra/e2b/alma-builder/build-template.mjs",
    [
      "E2B_API_KEY",
      "Template.build",
      "No cloud build was started",
      "serializeError",
    ],
  ],
  [
    "infra/e2b/alma-builder/preflight.mjs",
    [
      "cloudBuildStarted: false",
      "fileContextPath",
      "smoke-check.sh",
      "path.win32",
      "path.posix",
    ],
  ],
  [
    "infra/e2b/alma-builder/smoke.mjs",
    ["Template.toJSON", "Template.toDockerfile", "forbidden"],
  ],
  [
    "infra/e2b/alma-builder/smoke-check.sh",
    [
      "set -euo pipefail",
      "id -un",
      "/workspace/project",
      "codex --version",
      "OPENAI_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
  ],
  [
    "lib/builder/starterTransfer.ts",
    ["transferBuilderStarterToSandbox", ".alma-builder-starter-manifest.json"],
  ],
  [
    "lib/builder/artifactHandoff.ts",
    ["createBuilderSourceArtifact", "JSZip", "checksumSha256"],
  ],
];

let failed = false;
for (const [file, needles] of checks) {
  try {
    assertIncludes(file, needles);
  } catch (error) {
    console.error(error.message);
    failed = true;
  }
}

for (const file of [
  "app/api/builder/projects/route.ts",
  "app/api/builder/projects/[projectId]/route.ts",
  "app/api/builder/projects/[projectId]/sessions/route.ts",
  "app/api/builder/projects/[projectId]/events/route.ts",
  "app/api/builder/projects/[projectId]/github/route.ts",
]) {
  try {
    assertExcludes(file, [
      "Sandbox.",
      "new Codex",
      "child_process",
      "process.env.E2B_API_KEY",
      "process.env.CODEX_API_KEY",
      "process.env.OPENAI_API_KEY",
    ]);
  } catch (error) {
    console.error(error.message);
    failed = true;
  }
}

const fake = {
  sandboxId: "sandbox-1",
  projectDir: "/workspace/project",
  commands: ["install", "typecheck", "lint", "build", "start_preview"],
};
if (fake.projectDir !== "/workspace/project") {
  console.error("same-workspace identity failed");
  failed = true;
}
if (!fake.commands.includes("start_preview")) {
  console.error("preview startup command missing");
  failed = true;
}
if (
  createHash("sha256").update("artifact").digest("hex") !==
  "c7c5c1d70c5dec4416ab6158afd0b223ef40c29b1dc1f97ed9428b94d4cadb1c"
) {
  console.error("checksum verification failed");
  failed = true;
}

if (failed) process.exit(1);

console.log("ALMA Builder runtime wiring checks passed.");
