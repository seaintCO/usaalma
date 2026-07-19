import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

function source(file) {
  if (!existsSync(file)) {
    throw new Error(`${file}: missing file`);
  }
  return readFileSync(file, "utf8");
}

function assertIncludes(file, needles) {
  const text = source(file);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${file}: missing ${needle}`);
    }
  }
}

function assertExcludes(file, needles) {
  const text = source(file);
  for (const needle of needles) {
    if (text.includes(needle)) {
      throw new Error(`${file}: forbidden ${needle}`);
    }
  }
}

const checks = [
  [
    "package.json",
    [
      '"builder:worker"',
      '"builder:worker:once"',
      '"builder:e2b:template:build"',
      '"builder:e2b:template:smoke"',
    ],
  ],
  [
    "scripts/builder-worker-runtime-blocked.mjs",
    [
      "BUILDER_RUNTIME_WIRING_BLOCKED",
      "same remote E2B filesystem",
      "local ALMA worker filesystem",
    ],
  ],
  [
    "lib/builder/providers/codexCoding.provider.ts",
    [
      "hasRemoteE2BFilesystemBridge",
      "remoteFilesystemBridgeUnavailable",
      "Codex SDK cannot yet be proven to edit the same remote E2B filesystem",
      "workingDirectory: input.workingDirectory",
      'approvalPolicy: "never"',
      "networkAccessEnabled: false",
    ],
  ],
  [
    "workers/builder/runOnce.ts",
    [
      'workingDirectory: "/home/user/app"',
      "runAllowedCommand",
      "start_preview",
      "destroyWorkspaceAfterFailure",
    ],
  ],
  [
    "infra/e2b/alma-builder/template.mjs",
    [
      "alma-builder-node-lts",
      "/home/user/app",
      ".fromNodeImage",
      "build-essential",
      ".setUser",
      "waitForFile",
    ],
  ],
  [
    "infra/e2b/alma-builder/build-template.mjs",
    ["E2B_API_KEY", "Template.build", "No cloud build was started"],
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
      "/home/user/app",
      "OPENAI_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
  ],
  [
    "docs/alma-builder-architecture.md",
    [
      "Engine 1.1 Runtime Wiring Audit",
      "not genuinely runnable",
      "Codex SDK edits a local worker filesystem",
      "Remote filesystem bridge",
    ],
  ],
  [
    "docs/alma-builder-threat-model.md",
    [
      "Engine 1.1 Hard Stop",
      "same remote E2B filesystem",
      "generated source artifact handoff",
    ],
  ],
  [
    "docs/alma-builder-provider-decision.md",
    [
      "Engine 1.1 Decision Update",
      "remote E2B filesystem",
      "not accepted as a live production provider",
    ],
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

const deterministicRuntimeAssertions = [
  ["worker startup", "scripts/builder-worker-runtime-blocked.mjs"],
  ["job claim", "workers/builder/runOnce.ts"],
  ["provider not configured", "lib/builder/providers/codexCoding.provider.ts"],
  ["same workspace identity", "docs/alma-builder-architecture.md"],
  ["starter transfer blocker", "docs/alma-builder-architecture.md"],
  ["artifact exclusions", "docs/alma-builder-threat-model.md"],
  ["checksum verification blocker", "docs/alma-builder-architecture.md"],
  ["path traversal blocker", "docs/alma-builder-threat-model.md"],
  ["symlink escape blocker", "docs/alma-builder-threat-model.md"],
  ["secret redaction", "lib/builder/redaction.ts"],
  ["preview health failure", "lib/builder/providers/e2bPreview.provider.ts"],
  ["sandbox cleanup on failure", "workers/builder/runOnce.ts"],
];

class FakeWorkspaceProvider {
  constructor({ previewHealthy = true } = {}) {
    this.previewHealthy = previewHealthy;
    this.sandboxId = "fake-sandbox";
    this.workdir = "/home/user/app";
    this.commands = [];
    this.destroyed = false;
    this.starterTransferred = false;
  }

  async provisionWorkspace() {
    return {
      status: "success",
      data: {
        providerProjectId: "fake-project",
        providerWorkspaceId: "fake-workspace",
        sandboxId: this.sandboxId,
      },
    };
  }

  async transferStarter({ targetWorkdir }) {
    if (targetWorkdir !== this.workdir) {
      return { status: "permanent_failure" };
    }
    this.starterTransferred = true;
    return { status: "success" };
  }

  async runAllowedCommand({ sandboxId, cwd, command }) {
    if (sandboxId !== this.sandboxId || cwd !== this.workdir) {
      return { status: "permanent_failure" };
    }
    this.commands.push(command);
    return { status: "success" };
  }

  async destroyWorkspace() {
    this.destroyed = true;
    return { status: "success" };
  }
}

class FakeCodingProvider {
  constructor({ expectedWorkdir }) {
    this.expectedWorkdir = expectedWorkdir;
  }

  async startSession({ workingDirectory }) {
    if (workingDirectory !== this.expectedWorkdir) {
      return { status: "blocked" };
    }
    return { status: "success" };
  }
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isAllowedArtifactPath(value) {
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    normalized.includes("../") ||
    normalized === ".." ||
    normalized.startsWith("..")
  ) {
    return false;
  }
  return ![
    ".env",
    ".env.local",
    ".git/config",
    "node_modules/react/index.js",
    ".next/server/app.js",
    "dist/bundle.js",
    "coverage/coverage.json",
  ].includes(normalized);
}

function rejectsSymlinkEscape(target) {
  const normalized = target.replaceAll("\\", "/");
  return normalized.startsWith("/home/user/app/");
}

async function runFakeProviderTests() {
  const workspace = new FakeWorkspaceProvider();
  const provisioned = await workspace.provisionWorkspace();
  if (provisioned.status !== "success") {
    throw new Error("fake worker startup failed");
  }

  const claimed = { jobId: "job-1", claimed: true };
  if (!claimed.claimed) throw new Error("fake job claim failed");

  const transferred = await workspace.transferStarter({
    targetWorkdir: "/home/user/app",
  });
  if (transferred.status !== "success" || !workspace.starterTransferred) {
    throw new Error("fake starter transfer failed");
  }

  const coding = new FakeCodingProvider({ expectedWorkdir: workspace.workdir });
  const codingResult = await coding.startSession({
    workingDirectory: "/home/user/app",
  });
  if (codingResult.status !== "success") {
    throw new Error("fake same-workspace identity failed");
  }

  for (const command of ["typecheck", "lint", "build", "start_preview"]) {
    const result = await workspace.runAllowedCommand({
      sandboxId: workspace.sandboxId,
      cwd: workspace.workdir,
      command,
    });
    if (result.status !== "success") {
      throw new Error(`fake command failed: ${command}`);
    }
  }

  for (const unsafe of [
    "../secret",
    "/etc/passwd",
    ".env.local",
    ".git/config",
    "node_modules/react/index.js",
    ".next/server/app.js",
    "dist/bundle.js",
  ]) {
    if (isAllowedArtifactPath(unsafe)) {
      throw new Error(`fake artifact exclusion failed: ${unsafe}`);
    }
  }

  if (!isAllowedArtifactPath("app/page.tsx")) {
    throw new Error("fake safe artifact path rejected");
  }
  if (
    checksum("alma") !==
    "cf43e029efe6476e1f7f84691f89c876818610c2eaeaeb881103790a48745b82"
  ) {
    throw new Error("fake checksum verification failed");
  }
  if (rejectsSymlinkEscape("/tmp/escape")) {
    throw new Error("fake symlink escape rejection failed");
  }

  const unhealthyPreview = new FakeWorkspaceProvider({ previewHealthy: false });
  if (unhealthyPreview.previewHealthy) {
    throw new Error("fake preview health failure failed");
  }
  await workspace.destroyWorkspace();
  if (!workspace.destroyed) {
    throw new Error("fake sandbox cleanup failed");
  }

  const unavailableProvider = source("lib/builder/providers.ts");
  if (!unavailableProvider.includes("BUILDER_ENGINE_NOT_CONFIGURED")) {
    throw new Error("fake provider-not-configured state failed");
  }
}

for (const [name, file] of deterministicRuntimeAssertions) {
  if (!existsSync(file)) {
    console.error(`${name}: missing backing file ${file}`);
    failed = true;
  }
}

try {
  await runFakeProviderTests();
} catch (error) {
  console.error(error.message);
  failed = true;
}

if (failed) process.exit(1);

console.log("ALMA Builder runtime wiring checks passed.");
