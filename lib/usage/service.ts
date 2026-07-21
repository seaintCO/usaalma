import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  featureLimit,
  normalizeUsagePlan,
  requestedUnit,
  USAGE_LIMITS,
} from "./limits";
import type {
  AlmaMode,
  TokenUsage,
  UsageFeature,
  UsageReservation,
  UsageUnits,
} from "./types";
import { isUsageSubscriptionActive, resolveUsagePeriod } from "./policy";
import { executeUsageBoundary } from "./executionBoundary";

const usageRequestGroup = new AsyncLocalStorage<string>();

export class UsageLimitError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 429,
  ) {
    super(code);
    this.name = "UsageLimitError";
  }
}

export function usageErrorPayload(error: UsageLimitError) {
  const messages: Record<string, { en: string; es: string }> = {
    feature_not_in_plan: {
      en: "This feature is not included in your plan.",
      es: "Esta función no está incluida en tu plan.",
    },
    period_limit_reached: {
      en: "You have reached this billing period's usage limit.",
      es: "Alcanzaste el límite de uso de este período de facturación.",
    },
    daily_limit_reached: {
      en: "You have reached today's AI request limit.",
      es: "Alcanzaste el límite diario de solicitudes de IA.",
    },
    concurrency_limit_reached: {
      en: "Another AI request is still running. Try again shortly.",
      es: "Otra solicitud de IA sigue en curso. Inténtalo de nuevo en breve.",
    },
    builder_concurrency_reached: {
      en: "A Builder job is already active.",
      es: "Ya hay un trabajo de Builder activo.",
    },
    idempotency_replayed: {
      en: "This request is already running or has already completed.",
      es: "Esta solicitud ya está en curso o ya se completó.",
    },
    subscription_inactive: {
      en: "An active subscription is required.",
      es: "Se requiere una suscripción activa.",
    },
    usage_unavailable: {
      en: "Usage verification is temporarily unavailable.",
      es: "La verificación de uso no está disponible temporalmente.",
    },
  };
  return {
    ok: false,
    error: "usage_limit",
    code: error.code,
    message: messages[error.code] ?? messages.usage_unavailable,
  };
}

export async function reserveUsage(input: {
  userId: string;
  feature: UsageFeature;
  mode?: AlmaMode | null;
  model?: string | null;
  units: UsageUnits;
  idempotencyKey: string;
}): Promise<UsageReservation> {
  const idempotencyKey = usageRequestGroup.getStore() ?? input.idempotencyKey;
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ALMA_USAGE_ENFORCEMENT_ENABLED === "false"
  ) {
    return {
      id: "disabled",
      userId: input.userId,
      workspaceId: null,
      periodId: "disabled",
      feature: input.feature,
      mode: input.mode ?? null,
      model: input.model ?? null,
      idempotencyKey,
      reservedUnits: input.units,
    };
  }
  const subscription = await SubscriptionRepository.get(input.userId);
  if (!subscription || !isUsageSubscriptionActive(subscription.status))
    throw new UsageLimitError("subscription_inactive", 402);
  const plan = normalizeUsagePlan(subscription.plan);
  if (!plan) throw new UsageLimitError("feature_not_in_plan", 403);
  if (input.mode === "research_pro")
    throw new UsageLimitError("feature_not_in_plan", 403);
  const limits = USAGE_LIMITS[plan];
  const period = resolveUsagePeriod(subscription);
  const requested = requestedUnit(
    input.feature,
    input.mode ?? null,
    input.units,
  );
  const { data, error } = await createAdminClient().rpc("reserve_ai_usage", {
    p_user_id: input.userId,
    p_workspace_id: subscription.workspaceId,
    p_subscription_id: subscription.id,
    p_plan: plan,
    p_period_start: period.start,
    p_period_end: period.end,
    p_feature: input.feature,
    p_alma_mode: input.mode ?? null,
    p_provider_model: input.model ?? null,
    p_requested_units: requested,
    p_period_limit: featureLimit(limits, input.feature, input.mode ?? null),
    p_daily_limit: limits.dailyAiRequests,
    p_concurrency_limit: limits.concurrentProviderRequests,
    p_builder_concurrency_limit: limits.activeBuilderJobs,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw new UsageLimitError("usage_unavailable", 503);
  const result = data as {
    allowed?: boolean;
    code?: string;
    reservation_id?: string;
    period_id?: string;
  } | null;
  if (!result?.allowed || !result.reservation_id || !result.period_id)
    throw new UsageLimitError(
      result?.code ?? "usage_unavailable",
      result?.code?.includes("concurrency") ||
        result?.code === "idempotency_replayed"
        ? 409
        : 429,
    );
  usageRequestGroup.enterWith(idempotencyKey);
  return {
    id: result.reservation_id,
    userId: input.userId,
    workspaceId: subscription.workspaceId,
    periodId: result.period_id,
    feature: input.feature,
    mode: input.mode ?? null,
    model: input.model ?? null,
    idempotencyKey,
    reservedUnits: input.units,
  };
}

export async function settleUsage(
  reservation: UsageReservation,
  units: UsageUnits,
  tokens: TokenUsage = {},
  providerReference?: string,
) {
  if (reservation.id === "disabled") return;
  const actualUnits = requestedUnit(
    reservation.feature,
    reservation.mode,
    units,
  );
  const { error } = await createAdminClient().rpc("settle_ai_usage", {
    p_reservation_id: reservation.id,
    p_actual_units: actualUnits,
    p_input_tokens: tokens.inputTokens ?? 0,
    p_cached_tokens: tokens.cachedInputTokens ?? 0,
    p_output_tokens: tokens.outputTokens ?? 0,
    p_reasoning_tokens: tokens.reasoningTokens ?? 0,
    p_image_count: units.images ?? 0,
    p_voice_seconds: units.voiceSeconds ?? 0,
    p_document_pages: units.documentPages ?? 0,
    p_builder_jobs: units.builderJobs ?? 0,
    p_provider_reference: providerReference?.slice(0, 200) ?? null,
  });
  if (error) throw new UsageLimitError("usage_unavailable", 503);
}

export async function releaseUsage(reservation: UsageReservation) {
  if (reservation.id === "disabled") return;
  await createAdminClient().rpc("release_ai_usage", {
    p_reservation_id: reservation.id,
  });
}

export async function settleUsageById(
  reservationId: string,
  units: UsageUnits,
) {
  const { error } = await createAdminClient().rpc("settle_ai_usage", {
    p_reservation_id: reservationId,
    p_actual_units:
      units.builderJobs ??
      units.requests ??
      units.images ??
      units.voiceSeconds ??
      units.documentPages ??
      0,
    p_input_tokens: 0,
    p_cached_tokens: 0,
    p_output_tokens: 0,
    p_reasoning_tokens: 0,
    p_image_count: units.images ?? 0,
    p_voice_seconds: units.voiceSeconds ?? 0,
    p_document_pages: units.documentPages ?? 0,
    p_builder_jobs: units.builderJobs ?? 0,
    p_provider_reference: null,
  });
  if (error) throw new UsageLimitError("usage_unavailable", 503);
}

export async function releaseUsageById(reservationId: string) {
  await createAdminClient().rpc("release_ai_usage", {
    p_reservation_id: reservationId,
  });
}

export function openAITokenUsage(response: unknown): TokenUsage {
  const usage =
    typeof response === "object" && response && "usage" in response
      ? (response as { usage?: Record<string, unknown> }).usage
      : undefined;
  const details = usage?.input_tokens_details as
    Record<string, unknown> | undefined;
  const outputDetails = usage?.output_tokens_details as
    Record<string, unknown> | undefined;
  return {
    inputTokens: Number(usage?.input_tokens ?? usage?.prompt_tokens ?? 0),
    cachedInputTokens: Number(details?.cached_tokens ?? 0),
    outputTokens: Number(usage?.output_tokens ?? usage?.completion_tokens ?? 0),
    reasoningTokens: Number(outputDetails?.reasoning_tokens ?? 0),
  };
}

export async function withUsageReservation<T>(
  input: Parameters<typeof reserveUsage>[0],
  operation: () => Promise<T>,
  actualUnits = input.units,
): Promise<T> {
  return executeUsageBoundary({
    port: { reserve: reserveUsage, settle: settleUsage, release: releaseUsage },
    reservation: input,
    operation,
    actualUnits,
    usage: openAITokenUsage,
    providerReference: (result) =>
      typeof result === "object" && result && "id" in result
        ? String((result as { id?: unknown }).id ?? "")
        : undefined,
  });
}

export async function getUsageSummary(userId: string) {
  const subscription = await SubscriptionRepository.get(userId);
  const plan = normalizeUsagePlan(subscription?.plan);
  const limits = plan ? USAGE_LIMITS[plan] : null;
  const period = resolveUsagePeriod(subscription ?? {});
  if (!plan || !limits)
    return {
      plan: null,
      status: subscription?.status ?? "inactive",
      period,
      limits: null,
      used: {},
      dailyAiUsed: 0,
      recent: [],
    };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("read_ai_usage_summary", {
    p_user_id: userId,
    p_workspace_id: subscription?.workspaceId ?? null,
    p_period_start: period.start,
    p_period_end: period.end,
  });
  if (error) throw new UsageLimitError("usage_unavailable", 503);
  const summary = (data ?? {}) as {
    used?: Record<string, number>;
    daily_ai_used?: number;
    recent?: Array<Record<string, unknown>>;
  };
  return {
    plan,
    status: subscription?.status ?? "inactive",
    period,
    limits,
    used: summary.used ?? {},
    dailyAiUsed: Number(summary.daily_ai_used ?? 0),
    recent: summary.recent ?? [],
  };
}
