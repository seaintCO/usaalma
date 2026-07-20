import { existsSync, readFileSync } from "node:fs";

function read(file) {
  if (!existsSync(file)) throw new Error(`${file}: missing`);
  return readFileSync(file, "utf8");
}

function requireText(file, needles) {
  const source = read(file);
  for (const needle of needles) {
    if (!source.includes(needle)) throw new Error(`${file}: missing ${needle}`);
  }
}

function forbidText(file, needles) {
  const source = read(file);
  for (const needle of needles) {
    if (source.includes(needle))
      throw new Error(`${file}: forbidden ${needle}`);
  }
}

const checks = [
  [
    "package.json",
    [
      "builder:gateway",
      "builder:worker",
      "builder:runtime:build",
      "builder:runtime:check",
      "builder:runtime:container-check",
      "builder:gateway:prod",
      "builder:worker:prod",
      "builder:e2b:live-smoke",
      "builder:e2e:live",
    ],
  ],
  [
    "lib/builder/runtimeConfig.ts",
    [
      "control-plane",
      "gateway",
      "worker",
      "live-e2e",
      "ALMA_BUILDER_CODEX_WORKER_ISOLATED",
      "alma-builder-node-lts",
      "BUILDER_RUNTIME_CONFIG_INVALID",
    ],
  ],
  [
    "workers/builder/gateway/index.ts",
    ["/healthz", "/readyz", "assertBuilderRuntimeConfig", "/v1/responses"],
  ],
  [
    "workers/builder/index.ts",
    [
      "/healthz",
      "/readyz",
      "SIGTERM",
      "SIGINT",
      "heartbeatIntervalMs",
      "assertBuilderRuntimeConfig",
    ],
  ],
  [
    "workers/builder/runOnce.ts",
    [
      "BuilderEngineRepository.heartbeat",
      "destroyBuilderWorkspace",
      "ALMA_BUILDER_KEEP_PREVIEW_SANDBOX",
      "preview_url_validation_failed",
      "builder_preview_verified",
    ],
  ],
  [
    "infra/builder/gateway.Dockerfile",
    [
      "npm ci",
      "builder:runtime:build",
      "dist/builder-runtime",
      "node",
      "workers/builder/gateway/index.js",
    ],
  ],
  [
    "infra/builder/worker.Dockerfile",
    [
      "npm ci",
      "builder:runtime:build",
      "dist/builder-runtime",
      "builder-starters",
      "node",
      "workers/builder/index.js",
    ],
  ],
  [
    "scripts/build-alma-builder-runtime.mjs",
    [
      "transpileModule",
      "ModuleKind.CommonJS",
      "rewriteAliasRequires",
      "ALMA_BUILDER_RUNTIME_BUILD_READY",
    ],
  ],
  [
    "scripts/check-alma-builder-container-runtime.mjs",
    [
      "builder:runtime:build",
      "MODULE_NOT_FOUND",
      "BUILDER_RUNTIME_CONFIG_INVALID",
      "docker",
    ],
  ],
  [".dockerignore", [".env", ".git", ".next", "node_modules"]],
  [
    "scripts/check-alma-builder-e2b-live-smoke.mjs",
    [
      "ALMA_BUILDER_LIVE_E2B_CONFIRM",
      "alma-builder-node-lts",
      "alma-builder-smoke",
      "sandbox?.kill",
    ],
  ],
  [
    "scripts/run-alma-builder-live-e2e.mjs",
    [
      "ALMA_BUILDER_LIVE_E2E_CONFIRM",
      "run-one-builder-e2e",
      "builder:worker:once",
      "controlled non-production Builder E2E",
      "maxRuntimeMs",
    ],
  ],
];

let failed = false;
for (const [file, needles] of checks) {
  try {
    requireText(file, needles);
  } catch (error) {
    console.error(error.message);
    failed = true;
  }
}

for (const file of [
  "workers/builder/gateway/index.ts",
  "workers/builder/index.ts",
  "scripts/check-alma-builder-e2b-live-smoke.mjs",
  "scripts/run-alma-builder-live-e2e.mjs",
]) {
  try {
    forbidText(file, [
      "console.log(process.env",
      "OPENAI_API_KEY:",
      "SUPABASE_SERVICE_ROLE_KEY:",
      "E2B_API_KEY:",
    ]);
  } catch (error) {
    console.error(error.message);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log("ALMA Builder production runtime checks passed.");
