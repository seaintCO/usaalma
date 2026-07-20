import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

const serverUrl = "http://127.0.0.1:3101/login";

async function isReady() {
  try {
    const response = await fetch(serverUrl, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(server: ChildProcess) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `Playwright web server exited with code ${server.exitCode}.`,
      );
    }
    if (await isReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${serverUrl}.`);
}

function stopServer(server: ChildProcess) {
  if (!server.pid || server.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      timeout: 10_000,
    });
    return;
  }
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // The process may have already stopped after the final request.
  }
}

export default async function globalSetup() {
  if (await isReady()) return;

  const server = spawn(
    process.execPath,
    [
      path.join(process.cwd(), "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3101",
    ],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    },
  );
  server.unref();

  try {
    await waitForServer(server);
  } catch (error) {
    stopServer(server);
    throw error;
  }

  return () => stopServer(server);
}
