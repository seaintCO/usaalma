import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getStripe } from "@/lib/stripe/server";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  }

  const subscription = await SubscriptionRepository.get(user.id);

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error:"No Stripe customer found" }, { status:400 });
  }

  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
