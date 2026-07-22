import type { AlmaMode, UsageFeature, UsageUnits } from "./types";

export type UsagePlanKey = "starter" | "business";
export type UsagePlanLimits = {
  modes: Record<AlmaMode, number>;
  images: number;
  voiceSeconds: number;
  documentPages: number;
  builderJobs: number;
  dailyAiRequests: number;
  concurrentProviderRequests: number;
  activeBuilderJobs: number;
};

export const USAGE_LIMITS: Record<UsagePlanKey, UsagePlanLimits> = {
  starter: {
    modes: { instant: 500, thinking: 25, pro: 0, research_pro: 0 },
    images: 20,
    voiceSeconds: 60 * 60,
    documentPages: 100,
    builderJobs: 0,
    dailyAiRequests: 25,
    concurrentProviderRequests: 1,
    activeBuilderJobs: 0,
  },
  business: {
    modes: { instant: 2_000, thinking: 200, pro: 25, research_pro: 0 },
    images: 100,
    voiceSeconds: 300 * 60,
    documentPages: 1_000,
    builderJobs: 10,
    dailyAiRequests: 100,
    concurrentProviderRequests: 2,
    activeBuilderJobs: 1,
  },
};

export function normalizeUsagePlan(
  plan: string | null | undefined,
): UsagePlanKey | null {
  if (plan === "starter" || plan === "personal") return "starter";
  if (plan === "business" || plan === "pro") return "business";
  return null;
}

export function requestedUnit(
  feature: UsageFeature,
  mode: AlmaMode | null,
  units: UsageUnits,
) {
  if (feature === "ai_request") return units.requests ?? 1;
  if (feature === "image_generation") return units.images ?? 1;
  if (feature === "voice") return units.voiceSeconds ?? 0;
  if (feature === "document_analysis") return units.documentPages ?? 0;
  if (feature === "builder_build") return units.builderJobs ?? 1;
  return mode ? (units.requests ?? 1) : 0;
}

export function featureLimit(
  limits: UsagePlanLimits,
  feature: UsageFeature,
  mode: AlmaMode | null,
) {
  if (feature === "ai_request") return mode ? limits.modes[mode] : 0;
  if (feature === "image_generation") return limits.images;
  if (feature === "voice") return limits.voiceSeconds;
  if (feature === "document_analysis") return limits.documentPages;
  return limits.builderJobs;
}
