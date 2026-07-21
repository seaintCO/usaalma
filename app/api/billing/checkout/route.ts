import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { billingPriceId, normalizeBillingPlan } from "@/lib/billing/plans";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { getStripe } from "@/lib/stripe/server";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";

function failure(code: string, status: number) {
  return NextResponse.json({ ok: false, error: { code } }, { status });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return failure("authentication_required", 401);
  const body = await req.json().catch(() => ({}));
  const plan = normalizeBillingPlan(body.plan);
  if (!plan) return failure("unsupported_plan", 400);
  const priceId = billingPriceId(plan);
  if (
    !priceId ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_APP_URL
  ) {
    return failure("checkout_not_configured", 503);
  }

  try {
    const [existing, tenant] = await Promise.all([
      SubscriptionRepository.get(user.id),
      resolveTenantWorkspace({
        userId: user.id,
        workspaceId: body.workspaceId,
      }),
    ]);
    if (
      existing &&
      ["active", "trialing", "past_due", "unpaid"].includes(existing.status)
    ) {
      return failure("manage_existing_subscription", 409);
    }
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: existing?.stripeCustomerId || undefined,
        customer_email: existing?.stripeCustomerId
          ? undefined
          : (user.email ?? undefined),
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: user.id,
        metadata: {
          userId: user.id,
          workspaceId: tenant.workspaceId ?? "",
          plan,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            workspaceId: tenant.workspaceId ?? "",
            plan,
          },
        },
        success_url: `${appUrl}/billing/success`,
        cancel_url: `${appUrl}/billing?billing=cancelled`,
      },
      {
        idempotencyKey: `alma_checkout_${user.id}_${plan}_${new Date().toISOString().slice(0, 10)}`,
      },
    );
    if (!session.url) return failure("checkout_unavailable", 503);
    return NextResponse.json({ ok: true, url: session.url });
  } catch {
    console.error("CHECKOUT_SESSION_FAILED");
    return failure("checkout_unavailable", 503);
  }
}
