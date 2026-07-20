import http from "node:http";
import {
  assertBuilderRuntimeConfig,
  builderRuntimeHealthBody,
} from "@/lib/builder/runtimeConfig";
import { runBuilderJobOnce } from "./runOnce";

let shuttingDown = false;
let lastResult: unknown = null;
let lastHeartbeatAt = new Date().toISOString();

function writeJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function startHealthServer() {
  const port = Number(process.env.ALMA_BUILDER_WORKER_HEALTH_PORT ?? 8797);
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/healthz") {
      return writeJson(res, 200, {
        ok: true,
        service: "alma-builder-worker",
        shuttingDown,
        lastHeartbeatAt,
      });
    }
    if (req.method === "GET" && req.url === "/readyz") {
      const body = builderRuntimeHealthBody("worker");
      return writeJson(res, body.ok && !shuttingDown ? 200 : 503, {
        ...body,
        shuttingDown,
        lastResult,
      });
    }
    return writeJson(res, 404, { ok: false, code: "not_found" });
  });
  server.listen(port, () => {
    console.log(
      JSON.stringify({
        ok: true,
        service: "alma-builder-worker-health",
        port,
      }),
    );
  });
  return server;
}

async function main() {
  assertBuilderRuntimeConfig("worker");
  const healthServer = startHealthServer();
  const stop = (signal: string) => {
    shuttingDown = true;
    console.log(
      JSON.stringify({
        ok: true,
        service: "alma-builder-worker",
        signal,
        shuttingDown,
      }),
    );
    healthServer.close(() => undefined);
  };
  process.once("SIGTERM", () => stop("SIGTERM"));
  process.once("SIGINT", () => stop("SIGINT"));
  if (process.argv.includes("--loop")) {
    const delayMs = Number(process.env.ALMA_BUILDER_WORKER_POLL_MS ?? 5000);
    while (!shuttingDown) {
      const result = await runBuilderJobOnce({
        heartbeatIntervalMs: Math.max(10_000, Math.floor(delayMs / 2)),
      });
      lastResult = result;
      lastHeartbeatAt = new Date().toISOString();
      console.log(JSON.stringify({ ...result, workerHeartbeat: true }));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return;
  }
  const result = await runBuilderJobOnce();
  lastResult = result;
  lastHeartbeatAt = new Date().toISOString();
  console.log(JSON.stringify(result));
  healthServer.close(() => undefined);
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      code:
        error instanceof Error && "code" in error
          ? error.code
          : "builder_worker_failed",
      error: error instanceof Error ? error.message : "builder_worker_failed",
      validation:
        error instanceof Error && "validation" in error
          ? error.validation
          : undefined,
    }),
  );
  process.exit(1);
});
