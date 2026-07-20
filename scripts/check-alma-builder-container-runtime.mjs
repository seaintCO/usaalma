import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const gatewayEntry = path.join(
  root,
  "dist",
  "builder-runtime",
  "workers",
  "builder",
  "gateway",
  "index.js",
);
const workerEntry = path.join(
  root,
  "dist",
  "builder-runtime",
  "workers",
  "builder",
  "index.js",
);

function run(command, args, options = {}) {
  const executable =
    process.platform === "win32" && command === "npm"
      ? (process.env.ComSpec ?? "cmd.exe")
      : command;
  const commandArgs =
    process.platform === "win32" && command === "npm"
      ? ["/d", "/s", "/c", command, ...args]
      : args;
  return spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeEnv() {
  return {
    PATH: process.env.PATH ?? "",
    SystemRoot: process.env.SystemRoot ?? "",
    NODE_ENV: "production",
  };
}

function verifyMissingConfig(entry, label) {
  const result = run("node", [entry], {
    env: safeEnv(),
    timeout: 10_000,
  });
  const output = `${result.stdout}\n${result.stderr}`;
  assert(result.status !== 0, `${label} should fail without runtime config`);
  assert(
    output.includes("BUILDER_RUNTIME_CONFIG_INVALID"),
    `${label} did not return structured config failure`,
  );
  assert(!output.includes("MODULE_NOT_FOUND"), `${label} had MODULE_NOT_FOUND`);
  assert(!output.includes("Cannot find module"), `${label} had missing module`);
}

function verifyNoAliases() {
  for (const entry of [gatewayEntry, workerEntry]) {
    assert(existsSync(entry), `${entry} is missing`);
  }
  const gateway = readFileSync(gatewayEntry, "utf8");
  const worker = readFileSync(workerEntry, "utf8");
  assert(
    !gateway.includes("@/"),
    "Gateway artifact contains unresolved @/ alias",
  );
  assert(
    !worker.includes("@/"),
    "Worker artifact contains unresolved @/ alias",
  );
}

function dockerAvailable() {
  return run("docker", ["--version"], { timeout: 10_000 }).status === 0;
}

function verifyDockerImages() {
  if (!dockerAvailable()) {
    return { dockerAvailable: false, skipped: true };
  }
  const builds = [
    ["alma-builder-gateway-runtime-check", "infra/builder/gateway.Dockerfile"],
    ["alma-builder-worker-runtime-check", "infra/builder/worker.Dockerfile"],
  ];
  for (const [tag, dockerfile] of builds) {
    const build = run("docker", ["build", "-f", dockerfile, "-t", tag, "."], {
      timeout: 10 * 60 * 1000,
    });
    assert(build.status === 0, `${tag} image build failed:\n${build.stderr}`);
    const check = run("docker", ["run", "--rm", tag], { timeout: 20_000 });
    const output = `${check.stdout}\n${check.stderr}`;
    assert(check.status !== 0, `${tag} should fail without runtime config`);
    assert(
      output.includes("BUILDER_RUNTIME_CONFIG_INVALID"),
      `${tag} did not return structured config failure`,
    );
    assert(!output.includes("MODULE_NOT_FOUND"), `${tag} had MODULE_NOT_FOUND`);
    assert(!output.includes("Cannot find module"), `${tag} had missing module`);
  }
  return { dockerAvailable: true, skipped: false };
}

const build = run("npm", ["run", "builder:runtime:build"], {
  timeout: 120_000,
});
if (build.status !== 0) {
  throw new Error(
    `Builder runtime build failed:\n${build.stdout}\n${build.stderr}`,
  );
}
verifyNoAliases();
verifyMissingConfig(gatewayEntry, "Gateway runtime artifact");
verifyMissingConfig(workerEntry, "Worker runtime artifact");
const docker = verifyDockerImages();

console.log(
  JSON.stringify(
    {
      ok: true,
      code: "ALMA_BUILDER_CONTAINER_RUNTIME_CHECK_PASSED",
      gatewayEntry: "dist/builder-runtime/workers/builder/gateway/index.js",
      workerEntry: "dist/builder-runtime/workers/builder/index.js",
      docker,
      externalRequests: false,
    },
    null,
    2,
  ),
);
