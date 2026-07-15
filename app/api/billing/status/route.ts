import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    const subscription = await SubscriptionRepository.get(user.id);
    return NextResponse.json({
      ok: true,
      subscription: subscription ?? {
        plan: "free",
        status: "inactive",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        priceId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "billing_unavailable" },
      { status: 503 },
    );
  }
}
