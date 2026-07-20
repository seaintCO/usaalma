export type RuntimeConfigScope =
  | "public"
  | "server"
  | "service-role"
  | "provider"
  | "builder-control-plane"
  | "builder-gateway"
  | "builder-worker";
export type RuntimeCapability =
  | "supabase-public"
  | "supabase-service-role"
  | "openai"
  | "durable-chat"
  | "builder-control-plane"
  | "builder-gateway"
  | "builder-worker";
export type RuntimeReadinessStatus = "SET" | "MISSING" | "INVALID";
export type RuntimeReadinessResult = {
  capability: RuntimeCapability;
  scope: RuntimeConfigScope;
  ready: boolean;
  status: RuntimeReadinessStatus;
  missing: string[];
  invalid: string[];
  retryable: boolean;
  message: string;
};

export class RuntimeConfigError extends Error {
  readonly code = "RUNTIME_CONFIG_INVALID";
  constructor(readonly readiness: RuntimeReadinessResult) {
    super(readiness.message);
    this.name = "RuntimeConfigError";
  }
}

const REQUIRED = {
  "supabase-public": [
    "public",
    ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  ],
  "supabase-service-role": [
    "service-role",
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  ],
  openai: ["provider", ["OPENAI_API_KEY"]],
  "durable-chat": [
    "service-role",
    [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "CHAT_RUN_WORKER_SECRET",
    ],
  ],
  "builder-control-plane": [
    "builder-control-plane",
    [
      "ALMA_BUILDER_ENGINE_ENABLED",
      "ALMA_BUILDER_WORKER_SECRET",
      "ALMA_BUILDER_PREVIEW_HOSTS",
      "NEXT_PUBLIC_SUPABASE_URL",
    ],
  ],
  "builder-gateway": [
    "builder-gateway",
    [
      "ALMA_BUILDER_GATEWAY_SIGNING_KEY",
      "ALMA_BUILDER_CODEX_MODEL",
      "OPENAI_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
  ],
  "builder-worker": [
    "builder-worker",
    [
      "ALMA_BUILDER_ENGINE_ENABLED",
      "ALMA_BUILDER_E2B_TEMPLATE",
      "ALMA_BUILDER_GATEWAY_URL",
      "ALMA_BUILDER_GATEWAY_SIGNING_KEY",
      "ALMA_BUILDER_WORKER_SECRET",
      "ALMA_BUILDER_CODEX_MODEL",
      "ALMA_BUILDER_CODEX_WORKER_ISOLATED",
      "ALMA_BUILDER_PREVIEW_HOSTS",
      "E2B_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
  ],
} as const;
const value = (name: string) => process.env[name]?.trim() ?? "";
function valid(name: string) {
  const current = value(name);
  if (!current) return false;
  if (name === "NEXT_PUBLIC_SUPABASE_URL")
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(current);
  if (
    name === "ALMA_BUILDER_ENGINE_ENABLED" ||
    name === "ALMA_BUILDER_CODEX_WORKER_ISOLATED"
  )
    return current === "true";
  if (name === "ALMA_BUILDER_E2B_TEMPLATE")
    return current === "alma-builder-node-lts";
  if (name === "ALMA_BUILDER_GATEWAY_URL")
    return /^https?:\/\/[^/\s]+/i.test(current);
  if (name === "ALMA_BUILDER_GATEWAY_SIGNING_KEY") return current.length >= 32;
  return true;
}
export function getRuntimeReadiness(
  capability: RuntimeCapability,
): RuntimeReadinessResult {
  const [scope, required] = REQUIRED[capability];
  const missing = required.filter((name) => !value(name));
  const invalid = required.filter(
    (name) => !missing.includes(name) && !valid(name),
  );
  const ready = !missing.length && !invalid.length;
  return {
    capability,
    scope,
    ready,
    status: ready ? "SET" : missing.length ? "MISSING" : "INVALID",
    missing: [...missing],
    invalid: [...invalid],
    retryable: true,
    message: `${capability} ${ready ? "configuration is ready" : missing.length ? "is unavailable because required configuration is missing" : "is unavailable because configuration is invalid"}.`,
  };
}
export function assertRuntimeConfig(capability: RuntimeCapability) {
  const result = getRuntimeReadiness(capability);
  if (!result.ready) throw new RuntimeConfigError(result);
  return result;
}
export function isRuntimeConfigError(
  error: unknown,
): error is RuntimeConfigError {
  return error instanceof RuntimeConfigError;
}
export function safeRuntimeConfigErrorBody(error: RuntimeConfigError) {
  return {
    error: {
      code: error.code,
      capability: error.readiness.capability,
      status: error.readiness.status,
      missing: error.readiness.missing,
      invalid: error.readiness.invalid,
      retryable: error.readiness.retryable,
      message: error.readiness.message,
    },
  };
}
