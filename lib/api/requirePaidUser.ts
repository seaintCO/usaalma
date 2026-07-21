import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { EntitlementService } from "@/lib/platform/entitlements/service";

export async function requirePaidUser(moduleKey?: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_BETA_MODE === "true"
  ) {
    return { user, error: null };
  }

  if (moduleKey) {
    const entitlement = await EntitlementService.checkModuleAccess(
      user.id,
      moduleKey,
    );
    if (!entitlement || entitlement.accessStatus !== "included") {
      return {
        user: null,
        error: NextResponse.json(
          {
            ok: false,
            error: {
              code: "module_entitlement_required",
              module: moduleKey,
              requiredPlan: entitlement?.module.requiredPlan ?? null,
            },
          },
          { status: 403 },
        ),
      };
    }
    return { user, error: null };
  }

  const subscription = await SubscriptionRepository.get(user.id);

  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Subscription required" },
        { status: 402 },
      ),
    };
  }

  return { user, error: null };
}
