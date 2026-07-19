import { runBuilderJobOnce } from "./runOnce";

async function main() {
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
