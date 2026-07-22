import { createServer } from "node:http";
import next from "next";

const hostname = "127.0.0.1";
const port = 3101;
const app = next({ dev: true, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((request, response) => handle(request, response));
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, hostname, resolve);
});

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  server.closeAllConnections();
  server.close();
  process.exit(exitCode);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => stop(0));
}

process.on("uncaughtException", (error) => {
  console.error(error);
  stop(1);
});
