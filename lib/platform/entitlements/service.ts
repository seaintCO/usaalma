import type { BillingSubscription } from "@/lib/billing/types";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import {
  listAlmaModules,
  resolveAlmaModuleKey,
  type AlmaModuleDefinition,
  type AlmaPlanKey,
} from "@/lib/platform/modules/registry";

export type AlmaEntitlementStatus =
  "included" | "upgrade_required" | "unavailable";

export type AlmaModuleEntitlement = {
  module: AlmaModuleDefinition;
  accessStatus: AlmaEntitlementStatus;
  reason: "included" | "inactive_subscription" | "plan_upgrade" | "coming_soon";
};

export type AlmaUserEntitlements = {
  userId: string;
  currentPlan: AlmaPlanKey | null;
  subscription: BillingSubscription | null;
  modules: readonly AlmaModuleEntitlement[];
};

const PLAN_RANK: Record<AlmaPlanKey, number> = {
  free: 0,
  personal: 1,
  starter: 1,
  pro: 2,
  business: 3,
};

export function normalizeAlmaPlan(
  plan: string | null | undefined,
): AlmaPlanKey {
  if (plan === "business" || plan === "pro" || plan === "starter") {
    return plan;
  }
  if (plan === "personal") return "personal";
  return "free";
}

export function isSubscriptionActive(
  subscription: Pick<BillingSubscription, "status"> | null,
) {
  return ["active", "trialing"].includes(subscription?.status ?? "");
}

export function planIncludesModule(
  plan: string | null | undefined,
  module: AlmaModuleDefinition,
) {
  return PLAN_RANK[normalizeAlmaPlan(plan)] >= PLAN_RANK[module.requiredPlan];
}

export class EntitlementService {
  static evaluateModuleAccess(
    module: AlmaModuleDefinition,
    subscription: BillingSubscription | null,
  ): AlmaModuleEntitlement {
    if (module.releaseStatus === "coming_soon") {
      return { module, accessStatus: "unavailable", reason: "coming_soon" };
    }

    if (module.requiredPlan === "free") {
      return { module, accessStatus: "included", reason: "included" };
    }

    if (!isSubscriptionActive(subscription)) {
      return {
        module,
        accessStatus: "unavailable",
        reason: "inactive_subscription",
      };
    }

    if (!planIncludesModule(subscription?.plan, module)) {
      return {
        module,
        accessStatus: "upgrade_required",
        reason: "plan_upgrade",
      };
    }

    return { module, accessStatus: "included", reason: "included" };
  }

  static async getForUser(userId: string): Promise<AlmaUserEntitlements> {
    const subscription = await SubscriptionRepository.get(userId);
    const currentPlan = isSubscriptionActive(subscription)
      ? normalizeAlmaPlan(subscription?.plan)
      : null;

    return {
      userId,
      currentPlan,
      subscription,
      modules: listAlmaModules().map((module) =>
        EntitlementService.evaluateModuleAccess(module, subscription),
      ),
    };
  }

  static async checkModuleAccess(
    userId: string,
    moduleKey: string,
  ): Promise<AlmaModuleEntitlement | null> {
    const definition = resolveAlmaModuleKey(moduleKey);
    if (!definition) return null;

    const subscription = await SubscriptionRepository.get(userId);
    return EntitlementService.evaluateModuleAccess(definition, subscription);
  }
}
