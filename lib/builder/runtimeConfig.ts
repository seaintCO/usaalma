import { BUILDER_RUNTIME_LIMITS } from "./runtime";

export type BuilderRuntimeProcess =
  "control-plane" | "gateway" | "worker" | "live-e2e";

export type BuilderRuntimeValidation = {
  ok: boolean;
  process: BuilderRuntimeProcess;
  code: "BUILDER_RUNTIME_CONFIG_READY" | "BUILDER_RUNTIME_CONFIG_INVALID";
  missing: string[];
  invalid: string[];
  required: string[];
  optional: string[];
};

const COMMON_REQUIRED = [
  "ALMA_BUILDER_ENGINE_ENABLED",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export const BUILDER_RUNTIME_ENVIRONMENT = {
  "control-plane": {
    required: [
      "ALMA_BUILDER_ENGINE_ENABLED",
      "ALMA_BUILDER_WORKER_SECRET",
      "ALMA_BUILDER_PREVIEW_HOSTS",
      "NEXT_PUBLIC_SUPABASE_URL",
    ],
    optional: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
  gateway: {
    required: [
      "ALMA_BUILDER_GATEWAY_SIGNING_KEY",
      "ALMA_BUILDER_CODEX_MODEL",
      "OPENAI_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    optional: ["ALMA_BUILDER_GATEWAY_PORT", "ALMA_BUILDER_GATEWAY_AUDIENCE"],
  },
  worker: {
    required: [
      ...COMMON_REQUIRED,
      "ALMA_BUILDER_E2B_TEMPLATE",
      "ALMA_BUILDER_GATEWAY_URL",
      "ALMA_BUILDER_GATEWAY_SIGNING_KEY",
      "ALMA_BUILDER_WORKER_SECRET",
      "ALMA_BUILDER_CODEX_MODEL",
      "ALMA_BUILDER_CODEX_WORKER_ISOLATED",
      "ALMA_BUILDER_PREVIEW_HOSTS",
      "E2B_API_KEY",
    ],
    optional: [
      "ALMA_BUILDER_GATEWAY_AUDIENCE",
      "ALMA_BUILDER_WORKER_POLL_MS",
      "ALMA_BUILDER_WORKER_HEALTH_PORT",
      "ALMA_BUILDER_KEEP_PREVIEW_SANDBOX",
    ],
  },
  "live-e2e": {
    required: [
      ...COMMON_REQUIRED,
      "ALMA_BUILDER_E2B_TEMPLATE",
      "ALMA_BUILDER_GATEWAY_URL",
      "ALMA_BUILDER_GATEWAY_SIGNING_KEY",
      "ALMA_BUILDER_WORKER_SECRET",
      "ALMA_BUILDER_CODEX_MODEL",
      "ALMA_BUILDER_CODEX_WORKER_ISOLATED",
      "ALMA_BUILDER_PREVIEW_HOSTS",
      "E2B_API_KEY",
      "ALMA_BUILDER_LIVE_E2E_CONFIRM",
      "ALMA_BUILDER_E2E_USER_ID",
    ],
    optional: ["ALMA_BUILDER_E2E_WORKSPACE_ID"],
  },
} satisfies Record<
  BuilderRuntimeProcess,
  { required: readonly string[]; optional: readonly string[] }
>;

function value(name: string) {
  return process.env[name]?.trim() ?? "";
}

function validateKnownValues(input: {
  process: BuilderRuntimeProcess;
  missing: string[];
}) {
  const invalid: string[] = [];
  if (
    process.env.ALMA_BUILDER_ENGINE_ENABLED !== undefined &&
    value("ALMA_BUILDER_ENGINE_ENABLED") !== "true"
  ) {
    invalid.push("ALMA_BUILDER_ENGINE_ENABLED");
  }
  if (
    process.env.ALMA_BUILDER_CODEX_WORKER_ISOLATED !== undefined &&
    value("ALMA_BUILDER_CODEX_WORKER_ISOLATED") !== "true"
  ) {
    invalid.push("ALMA_BUILDER_CODEX_WORKER_ISOLATED");
  }
  if (
    process.env.ALMA_BUILDER_E2B_TEMPLATE !== undefined &&
    value("ALMA_BUILDER_E2B_TEMPLATE") !== "alma-builder-node-lts"
  ) {
    invalid.push("ALMA_BUILDER_E2B_TEMPLATE");
  }
  if (
    process.env.ALMA_BUILDER_GATEWAY_SIGNING_KEY !== undefined &&
    value("ALMA_BUILDER_GATEWAY_SIGNING_KEY").length < 32
  ) {
    invalid.push("ALMA_BUILDER_GATEWAY_SIGNING_KEY");
  }
  if (
    process.env.ALMA_BUILDER_GATEWAY_URL !== undefined &&
    !/^https?:\/\/[^/\s]+/i.test(value("ALMA_BUILDER_GATEWAY_URL"))
  ) {
    invalid.push("ALMA_BUILDER_GATEWAY_URL");
  }
  if (
    process.env.ALMA_BUILDER_PREVIEW_HOSTS !== undefined &&
    !value("ALMA_BUILDER_PREVIEW_HOSTS")
  ) {
    invalid.push("ALMA_BUILDER_PREVIEW_HOSTS");
  }
  if (
    process.env.ALMA_BUILDER_CODEX_MODEL !== undefined &&
    !value("ALMA_BUILDER_CODEX_MODEL")
  ) {
    invalid.push("ALMA_BUILDER_CODEX_MODEL");
  }
  if (
    process.env.ALMA_BUILDER_LIVE_E2E_CONFIRM !== undefined &&
    value("ALMA_BUILDER_LIVE_E2E_CONFIRM") !== "run-one-builder-e2e"
  ) {
    invalid.push("ALMA_BUILDER_LIVE_E2E_CONFIRM");
  }
  return invalid.filter((name) => !input.missing.includes(name));
}

export function validateBuilderRuntimeConfig(
  processName: BuilderRuntimeProcess,
): BuilderRuntimeValidation {
  const config = BUILDER_RUNTIME_ENVIRONMENT[processName];
  const missing = config.required.filter((name) => !value(name));
  const invalid = validateKnownValues({ process: processName, missing });
  return {
    ok: missing.length === 0 && invalid.length === 0,
    process: processName,
    code:
      missing.length === 0 && invalid.length === 0
        ? "BUILDER_RUNTIME_CONFIG_READY"
        : "BUILDER_RUNTIME_CONFIG_INVALID",
    missing,
    invalid,
    required: [...config.required],
    optional: [...config.optional],
  };
}

export function assertBuilderRuntimeConfig(processName: BuilderRuntimeProcess) {
  const validation = validateBuilderRuntimeConfig(processName);
  if (!validation.ok) {
    const error = new Error(
      `ALMA Builder ${processName} configuration is invalid.`,
    );
    Object.assign(error, {
      name: "BuilderRuntimeConfigError",
      code: validation.code,
      validation,
    });
    throw error;
  }
  return validation;
}

export function builderRuntimeHealthBody(processName: BuilderRuntimeProcess) {
  const validation = validateBuilderRuntimeConfig(processName);
  return {
    ok: validation.ok,
    service: `alma-builder-${processName}`,
    process: processName,
    code: validation.code,
    missing: validation.missing,
    invalid: validation.invalid,
    limits: {
      gatewayTokenTtlSeconds: BUILDER_RUNTIME_LIMITS.gatewayTokenTtlSeconds,
      maxGatewayRequestsPerToken:
        BUILDER_RUNTIME_LIMITS.maxGatewayRequestsPerToken,
      maxCodexRuntimeMs: BUILDER_RUNTIME_LIMITS.maxCodexRuntimeMs,
      maxArtifactBytes: BUILDER_RUNTIME_LIMITS.maxArtifactBytes,
    },
  };
}
