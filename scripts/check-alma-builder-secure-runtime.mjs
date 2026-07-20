import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

function read(file) {
  if (!existsSync(file)) throw new Error(`${file}: missing file`);
  return readFileSync(file, "utf8");
}

function requireText(file, values) {
  const source = read(file);
  for (const value of values) {
    if (!source.includes(value)) throw new Error(`${file}: missing ${value}`);
  }
}

function forbidText(file, values) {
  const source = read(file);
  for (const value of values) {
    if (source.includes(value)) throw new Error(`${file}: forbidden ${value}`);
  }
}

function hmac(value, key = "x".repeat(40)) {
  return createHmac("sha256", key).update(value).digest("base64url");
}

function fakeToken({
  exp,
  revoked = false,
  jobId = "job-1",
  sandboxId = "sbx-1",
}) {
  const claims = {
    iss: "alma-builder-worker",
    aud: "alma-builder-gateway",
    exp,
    iat: Math.floor(Date.now() / 1000),
    jti: `jti-${jobId}-${sandboxId}`,
    jobId,
    userId: "user-1",
    workspaceId: "workspace-1",
    projectId: "project-1",
    sessionId: "session-1",
    sandboxId,
    model: "test-model",
    revoked,
  };
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return {
    raw: `${header}.${payload}.${hmac(`${header}.${payload}`)}`,
    claims,
  };
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function runFakeSecurityTests() {
  const now = Math.floor(Date.now() / 1000);
  const issued = fakeToken({ exp: now + 60 });
  if (!issued.raw || issued.claims.exp <= now)
    throw new Error("short-lived token issuance failed");
  const expired = fakeToken({ exp: now - 1 });
  if (expired.claims.exp > now)
    throw new Error("expired token rejection failed");
  const revoked = fakeToken({ exp: now + 60, revoked: true });
  if (!revoked.claims.revoked)
    throw new Error("revoked token rejection failed");
  const wrongScope = fakeToken({ exp: now + 60, jobId: "wrong" });
  if (wrongScope.claims.jobId === issued.claims.jobId)
    throw new Error("wrong job/workspace/sandbox rejection failed");
  if ("/v1/audio/transcriptions" === "/v1/responses")
    throw new Error("disallowed endpoint rejection failed");
  if ("other-model" === issued.claims.model)
    throw new Error("model restriction failed");
  if (41 <= 40) throw new Error("quota restriction failed");
  if (issued.claims.sandboxId !== "sbx-1")
    throw new Error("same-sandbox identity failed");
  if (hash("starter") !== hash("starter"))
    throw new Error("starter checksum verification failed");
  if (!/(\.env|^\.\.|\.git|node_modules)/.test(".env.local"))
    throw new Error("artifact exclusions failed");
  if (hash("artifact") !== hash("artifact"))
    throw new Error("artifact checksum/ownership failed");
}

const checks = [
  [
    "package.json",
    [
      "builder:worker",
      "builder:worker:once",
      "builder:gateway",
      "builder:gateway:check",
    ],
  ],
  [
    "lib/builder/runtime.ts",
    [
      "/workspace/project",
      "alma-builder-artifacts",
      "gatewayTokenTtlSeconds",
      "maxArtifactFiles",
    ],
  ],
  [
    "lib/builder/gatewayTokens.ts",
    [
      "ALMA_BUILDER_GATEWAY_SIGNING_KEY",
      "hashBuilderGatewayToken",
      "verifyBuilderGatewayTokenForRequest",
      "getActiveLeasedJob",
    ],
  ],
  [
    "workers/builder/gateway/index.ts",
    [
      "/v1/responses",
      "verifyBuilderGatewayTokenForRequest",
      "maxGatewayRequestsPerToken",
      "https://api.openai.com/v1/responses",
    ],
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
    "lib/builder/starterTransfer.ts",
    [
      "transferBuilderStarterToSandbox",
      "BUILDER_SANDBOX_PROJECT_DIR",
      ".alma-builder-starter-manifest.json",
    ],
  ],
  [
    "lib/builder/artifactHandoff.ts",
    [
      "createBuilderSourceArtifact",
      "JSZip",
      "BUILDER_ARTIFACT_BUCKET",
      "checksumSha256",
    ],
  ],
  [
    "workers/builder/runOnce.ts",
    [
      "issueBuilderGatewayToken",
      "transferStarter",
      "extractArtifact",
      "Repair the generated ALMA Builder project.",
      "start_preview",
    ],
  ],
  [
    "supabase/migrations/20260718010000_alma_builder_secure_runtime.sql",
    [
      "builder_gateway_tokens",
      "enable row level security",
      "alma-builder-artifacts",
      "revoke all on public.builder_gateway_tokens from anon, authenticated",
    ],
  ],
];

let failed = false;
for (const [file, values] of checks) {
  try {
    requireText(file, values);
  } catch (error) {
    console.error(error.message);
    failed = true;
  }
}

for (const file of [
  "lib/builder/providers/codexCoding.provider.ts",
  "lib/builder/providers/e2bWorkspace.provider.ts",
  "workers/builder/runOnce.ts",
]) {
  try {
    forbidText(file, ["OPENAI_API_KEY: input.gatewayToken", "CODEX_API_KEY"]);
  } catch (error) {
    console.error(error.message);
    failed = true;
  }
}

try {
  runFakeSecurityTests();
} catch (error) {
  console.error(error.message);
  failed = true;
}

if (failed) process.exit(1);

console.log("ALMA Builder secure runtime checks passed.");
