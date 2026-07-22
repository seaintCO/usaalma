export type AlmaMode = "instant" | "thinking" | "pro" | "research_pro";
export type UsageFeature =
  | "ai_request"
  | "image_generation"
  | "voice"
  | "document_analysis"
  | "builder_build";

export type UsageUnits = {
  requests?: number;
  images?: number;
  voiceSeconds?: number;
  documentPages?: number;
  builderJobs?: number;
};

export type TokenUsage = {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
};

export type UsageReservation = {
  id: string;
  userId: string;
  workspaceId: string | null;
  periodId: string;
  feature: UsageFeature;
  mode: AlmaMode | null;
  model: string | null;
  idempotencyKey: string;
  reservedUnits: UsageUnits;
};
