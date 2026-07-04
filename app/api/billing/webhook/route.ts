import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

function getPlanFromPrice(priceId?:string | null) {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_STARTER || priceId === process.env.STRIPE_PRICE_PERSONAL) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  return "starter";
}

async function upsertSubscription(subscription:any, fallbackUserId?:string, fallbackPlan?:string) {
  const supabase = await createClient();

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id;
  const plan = fallbackPlan || subscription.metadata?.plan || getPlanFromPrice(priceId);
  const userId = subscription.metadata?.userId || fallbackUserId;

  if (!userId) {
    console.error("WEBHOOK_MISSING_USER_ID", subscription.id);
    return;
  }

  await supabase.from("subscriptions").upsert({
    user_id:userId,
    stripe_customer_id:subscription.customer?.toString(),
    stripe_subscription_id:subscription.id,
    plan,
    status:subscription.status,
    current_period_end:subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end:Boolean(subscription.cancel_at_period_end),
    updated_at:new Date().toISOString(),
  });
}

export async function POST(req:Request) {
  const stripe = getStripe();
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error:"Missing Stripe webhook secret" }, { status:400 });
  }

  let event:Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err:any) {
    console.error("STRIPE_WEBHOOK_SIGNATURE_ERROR", err.message);
    return NextResponse.json({ error:"Invalid Stripe webhook signature" }, { status:400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId || session.client_reference_id || undefined;
      const plan = session.metadata?.plan || "starter";

      if (session.subscription) {
        const subscription:any = await stripe.subscriptions.retrieve(session.subscription.toString());
        await upsertSubscription(subscription, userId, plan);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription:any = event.data.object;
      await upsertSubscription(subscription);
    }

    if (event.type === "invoice.payment_failed") {
      const invoice:any = event.data.object;
      const subscriptionId = invoice.subscription?.toString();

      if (subscriptionId) {
        const subscription:any = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscription(subscription);
      }
    }

    return NextResponse.json({ received:true });
  } catch (err:any) {
    console.error("STRIPE_WEBHOOK_HANDLER_ERROR", event.type, err.message);
    return NextResponse.json({ error:"Webhook handler failed" }, { status:500 });
  }
}
