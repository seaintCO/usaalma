/** Canonical server-side model configuration with deployment overrides. */
export const OPENAI_MODELS = {
  fast: process.env.ALMA_FAST_MODEL || process.env.ALMA_TEXT_MODEL || "gpt-4.1-mini",
  deep: process.env.ALMA_DEEP_MODEL || process.env.ALMA_REASONING_MODEL || process.env.ALMA_MODEL || "gpt-4.1",
  router: process.env.ALMA_ROUTER_MODEL || process.env.ALMA_FAST_MODEL || "gpt-4.1-mini",
  image: process.env.ALMA_IMAGE_MODEL || "gpt-image-1",
  embedding: "text-embedding-3-small",
} as const;

export function getAlmaTextModel() {
  return OPENAI_MODELS.deep;
}
