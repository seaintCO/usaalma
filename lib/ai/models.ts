/**
 * Model selection is centralized here so stale deployment variables cannot
 * revive retired model IDs. Values are names only; secrets are never logged.
 */
const ALLOWED_TEXT_MODELS = new Set(["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"]);
const ALLOWED_IMAGE_MODELS = new Set(["gpt-image-2"]);
const ALLOWED_EMBEDDING_MODELS = new Set(["text-embedding-3-small"]);

function configuredModel(variable: string, fallback: string, allowed: Set<string>) {
  const configured = process.env[variable]?.trim();
  if (!configured) return fallback;
  if (allowed.has(configured)) return configured;
  console.warn(`ALMA_INVALID_MODEL_CONFIG variable=${variable}; using fallback=${fallback}`);
  return fallback;
}

function firstConfiguredModel(variables: string[], fallback: string, allowed: Set<string>) {
  for (const variable of variables) {
    if (process.env[variable]?.trim()) return configuredModel(variable, fallback, allowed);
  }
  return fallback;
}

export const OPENAI_MODELS = {
  fast: firstConfiguredModel(["ALMA_FAST_MODEL", "ALMA_TEXT_MODEL"], "gpt-4.1-mini", ALLOWED_TEXT_MODELS),
  deep: firstConfiguredModel(["ALMA_DEEP_MODEL", "ALMA_REASONING_MODEL", "ALMA_MODEL"], "gpt-4.1", ALLOWED_TEXT_MODELS),
  router: firstConfiguredModel(["ALMA_ROUTER_MODEL", "ALMA_FAST_MODEL"], "gpt-4.1-mini", ALLOWED_TEXT_MODELS),
  text: firstConfiguredModel(["ALMA_TEXT_MODEL", "ALMA_FAST_MODEL"], "gpt-4.1-mini", ALLOWED_TEXT_MODELS),
  launch: configuredModel("OPENAI_MODEL", "gpt-4o-mini", ALLOWED_TEXT_MODELS),
  vision: configuredModel("OPENAI_VISION_MODEL", "gpt-4o-mini", ALLOWED_TEXT_MODELS),
  image: configuredModel("ALMA_IMAGE_MODEL", "gpt-image-2", ALLOWED_IMAGE_MODELS),
  embedding: "text-embedding-3-small" as typeof ALLOWED_EMBEDDING_MODELS extends Set<infer T> ? T : never,
} as const;

export function getAlmaTextModel() {
  return OPENAI_MODELS.deep;
}
