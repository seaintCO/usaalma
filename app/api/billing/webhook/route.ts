import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error:"Missing webhook signature" }, { status:400 });
  }

  let event:Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error:"Invalid webhook" }, { status:400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan ?? "personal";

    if (userId && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription.toString()
      );

      const supabase = await createClient();

      await supabase.from("subscriptions").upsert({
        user_id:userId,
        stripe_customer_id:session.customer?.toString(),
        stripe_subscription_id:subscription.id,
        plan,
        status:subscription.status,
        current_period_end:new Date(subscription.current_period_end * 1000).toISOString(),
      });
    }
  }

  return NextResponse.json({ received:true });
}
