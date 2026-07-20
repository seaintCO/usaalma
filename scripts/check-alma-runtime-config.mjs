import { createJiti } from "jiti";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const jiti = createJiti(import.meta.url);
const { getRuntimeReadiness } = jiti("../lib/runtime/readiness.ts");

const capabilities = [
  "supabase-public",
  "supabase-service-role",
  "openai",
  "durable-chat",
  "builder-control-plane",
  "builder-gateway",
  "builder-worker",
];

const readiness = capabilities.map((capability) =>
  getRuntimeReadiness(capability),
);
const output = JSON.stringify({ ok: true, readiness }, null, 2);
if (output.match(/sk-|eyJ|OPENAI_API_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=.+/)) {
  throw new Error("Runtime readiness output may contain a secret value.");
}
if (!output.includes('"capability": "supabase-service-role"')) {
  throw new Error("Runtime readiness did not include service-role status.");
}
if (!output.includes('"missing"')) {
  throw new Error("Runtime readiness did not report safe missing names.");
}
process.stdout.write(output.trim() + "\n");
