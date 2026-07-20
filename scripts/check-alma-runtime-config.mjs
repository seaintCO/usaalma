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
const localControlPlane = readiness.filter(
  ({ capability }) =>
    capability !== "builder-gateway" && capability !== "builder-worker",
);
const optionalLocalBuilderServices = readiness
  .filter(({ capability }) =>
    ["builder-gateway", "builder-worker"].includes(capability),
  )
  .map((result) => ({
    ...result,
    deployment: "remote-service",
    requiredForLocalControlPlane: false,
    localStatus: result.ready
      ? "configured-for-local-development"
      : "optional-not-configured",
  }));
const output = JSON.stringify(
  {
    ok: localControlPlane.every(({ ready }) => ready),
    topology: {
      localControlPlane: "validated-from-local-environment",
      builderGatewayAndWorker: "deployed-and-monitored-remotely",
      optionalLocalServiceDevelopment: "reported-separately",
    },
    readiness: localControlPlane,
    optionalLocalBuilderServices,
  },
  null,
  2,
);
if (output.match(/sk-|eyJ|OPENAI_API_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=.+/)) {
  throw new Error("Runtime readiness output may contain a secret value.");
}
if (!output.includes('"capability": "supabase-service-role"')) {
  throw new Error("Runtime readiness did not include service-role status.");
}
if (!output.includes('"missing"')) {
  throw new Error("Runtime readiness did not report safe missing names.");
}
if (!output.includes('"requiredForLocalControlPlane": false')) {
  throw new Error(
    "Remote Builder services were reported as local requirements.",
  );
}
process.stdout.write(output.trim() + "\n");
