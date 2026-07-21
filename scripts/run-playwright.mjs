import { spawn, spawnSync } from "node:child_process";

const server = spawn(process.execPath, ["scripts/playwright-server.mjs"], {
  stdio: "ignore",
  windowsHide: true,
});

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Playwright server exited early");
    try {
      const response = await fetch("http://127.0.0.1:3101/login");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the Playwright server");
}

function stopServer() {
  if (!server.pid || server.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    server.kill("SIGTERM");
  }
}

let exitCode = 1;
try {
  await waitForServer();
  exitCode = await new Promise((resolve, reject) => {
    const testProcess = spawn(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "--config=playwright.config.ts",
        ...process.argv.slice(2),
      ],
      { stdio: "inherit", windowsHide: true },
    );
    testProcess.once("error", reject);
    testProcess.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  stopServer();
}

process.exit(exitCode);
