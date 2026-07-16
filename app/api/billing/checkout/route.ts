import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getStripe } from "@/lib/stripe/server";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

const PRICE_MAP: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
  personal:
    process.env.STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_PERSONAL,
};

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan || "starter").toLowerCase();
    const priceId = PRICE_MAP[plan];

    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price for ${plan} is not configured.` },
        { status: 500 },
      );
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL is not configured." },
        { status: 500 },
      );
    }

    const existingSub = await SubscriptionRepository.get(user.id);

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existingSub?.stripeCustomerId || undefined,
      customer_email: existingSub?.stripeCustomerId
        ? undefined
        : (user.email ?? undefined),
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan },
      subscription_data: { metadata: { userId: user.id, plan } },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    console.error("CHECKOUT_ERROR");
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 },
    );
  }
}
