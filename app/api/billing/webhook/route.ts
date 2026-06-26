import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const stripe = getStripe();
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error:"Missing Stripe webhook secret" }, { status:400 });
  }

  let event:Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error:"Invalid Stripe webhook signature" }, { status:400 });
  }

  const supabase = await createClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan ?? "personal";

    if (userId && session.subscription) {
      const subscription:any = await stripe.subscriptions.retrieve(
        session.subscription.toString()
      );

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

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription:any = event.data.object as any;

    const userId = subscription.metadata?.userId;
    const plan = subscription.metadata?.plan ?? "personal";

    if (userId) {
      await supabase.from("subscriptions").upsert({
        user_id:userId,
        stripe_customer_id:subscription.customer?.toString(),
        stripe_subscription_id:subscription.id,
        plan,
        status:subscription.status,
        current_period_end:subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      });
    }
  }

  return NextResponse.json({ received:true });
}

