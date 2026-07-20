export const BUILDER_SANDBOX_PROJECT_DIR = "/workspace/project";
export const BUILDER_SANDBOX_TMP_DIR = "/tmp/alma-builder";
export const BUILDER_CODEX_HOME = "/tmp/alma-codex-home";
export const BUILDER_GATEWAY_ISSUER = "alma-builder-worker";
export const BUILDER_GATEWAY_DEFAULT_AUDIENCE = "alma-builder-gateway";
export const BUILDER_ARTIFACT_BUCKET = "alma-builder-artifacts";
export const BUILDER_CODEX_CLI_VERSION = "0.144.6";

export const BUILDER_RUNTIME_LIMITS = {
  gatewayTokenTtlSeconds: 12 * 60,
  maxGatewayRequestsPerToken: 40,
  maxGatewayRequestBytes: 1_000_000,
  maxGatewayOutputBytes: 2_000_000,
  maxArtifactFiles: 800,
  maxArtifactBytes: 15 * 1024 * 1024,
  maxStarterFiles: 120,
  maxStarterBytes: 2 * 1024 * 1024,
  maxCodexRuntimeMs: 8 * 60 * 1000,
} as const;
