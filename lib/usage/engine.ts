import { featureLimit, requestedUnit, type UsagePlanLimits } from "./limits";
import type { AlmaMode, UsageFeature, UsageUnits } from "./types";

export type UsageSnapshot = {
  periodUsed: number;
  dailyAiUsed: number;
  activeProviderRequests: number;
  activeBuilderJobs: number;
};

export function evaluateUsageReservation(input: {
  limits: UsagePlanLimits;
  feature: UsageFeature;
  mode: AlmaMode | null;
  units: UsageUnits;
  snapshot: UsageSnapshot;
}) {
  const requested = requestedUnit(input.feature, input.mode, input.units);
  const limit = featureLimit(input.limits, input.feature, input.mode);
  if (requested <= 0) return { allowed: false as const, code: "invalid_units" };
  if (limit <= 0)
    return { allowed: false as const, code: "feature_not_in_plan" };
  if (input.snapshot.periodUsed + requested > limit)
    return { allowed: false as const, code: "period_limit_reached" };
  if (
    input.feature === "ai_request" &&
    input.snapshot.dailyAiUsed + requested > input.limits.dailyAiRequests
  )
    return { allowed: false as const, code: "daily_limit_reached" };
  if (
    input.snapshot.activeProviderRequests >=
    input.limits.concurrentProviderRequests
  )
    return { allowed: false as const, code: "concurrency_limit_reached" };
  if (
    input.feature === "builder_build" &&
    input.snapshot.activeBuilderJobs >= input.limits.activeBuilderJobs
  )
    return { allowed: false as const, code: "builder_concurrency_reached" };
  return {
    allowed: true as const,
    requested,
    limit,
    remaining: Math.max(0, limit - input.snapshot.periodUsed - requested),
  };
}
