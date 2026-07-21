import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getStripe } from "@/lib/stripe/server";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await SubscriptionRepository.get(user.id);

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found" },
      { status: 400 },
    );
  }

  if (!process.env.NEXT_PUBLIC_APP_URL || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "billing_not_configured" },
      { status: 503 },
    );
  }

  try {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch {
    console.error("BILLING_PORTAL_SESSION_FAILED");
    return NextResponse.json(
      { ok: false, error: { code: "portal_unavailable" } },
      { status: 503 },
    );
  }
}
