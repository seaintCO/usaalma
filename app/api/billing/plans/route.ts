import { getStripe } from "@/lib/stripe/server";
import type { BillingPlan, BillingPriceOption } from "@/lib/billing/types";
import { getCurrentUser } from "@/lib/auth/user";
import { NextResponse } from "next/server";
import { billingPriceId } from "@/lib/billing/plans";

const planPriceIds: Record<BillingPlan, string | undefined> = {
  starter: billingPriceId("starter"),
  business: billingPriceId("business"),
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const entries = Object.entries(planPriceIds).filter(
    (entry): entry is [BillingPlan, string] => Boolean(entry[1]),
  );
  if (!entries.length) {
    return NextResponse.json({ ok: true, configured: false, plans: [] });
  }

  try {
    const stripe = getStripe();
    const plans = await Promise.all(
      entries.map(
        async ([plan, priceId]): Promise<BillingPriceOption | null> => {
          const price = await stripe.prices.retrieve(priceId);
          if (!price.active) return null;
          return {
            plan,
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval ?? null,
          };
        },
      ),
    );
    return NextResponse.json({
      ok: true,
      configured: true,
      plans: plans.filter((plan): plan is BillingPriceOption => plan !== null),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "plans_unavailable" },
      { status: 503 },
    );
  }
}
