import { runBuilderJobOnce } from "./runOnce";

async function main() {
  if (process.argv.includes("--loop")) {
    const delayMs = Number(process.env.ALMA_BUILDER_WORKER_POLL_MS ?? 5000);
    for (;;) {
      const result = await runBuilderJobOnce();
      console.log(JSON.stringify(result));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  const result = await runBuilderJobOnce();
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "builder_worker_failed",
    }),
  );
  process.exit(1);
});
