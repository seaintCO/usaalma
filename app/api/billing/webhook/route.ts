import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import {
  shouldApplyStripeEvent,
  subscriptionRecord,
} from "@/lib/billing/webhook";

const subscriptionEvents = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parent = invoice.parent?.subscription_details?.subscription;
  return typeof parent === "string" ? parent : (parent?.id ?? null);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (
    !signature ||
    !process.env.STRIPE_WEBHOOK_SECRET ||
    !process.env.STRIPE_SECRET_KEY
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "webhook_not_configured" } },
      { status: 503 },
    );
  }
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_signature" } },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error: ledgerError } = await admin
    .from("stripe_webhook_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      event_created: event.created,
      processing_status: "processing",
    });
  if (ledgerError) {
    if (ledgerError.code === "23505") {
      const { data: ledger } = await admin
        .from("stripe_webhook_events")
        .select("processing_status")
        .eq("stripe_event_id", event.id)
        .maybeSingle();
      if (ledger?.processing_status === "processed") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      const { error: retryError } = await admin
        .from("stripe_webhook_events")
        .update({ processing_status: "processing", processed_at: null })
        .eq("stripe_event_id", event.id);
      if (!retryError) {
        // Continue processing a previously failed or interrupted delivery.
      } else {
        return NextResponse.json(
          { ok: false, error: { code: "ledger_unavailable" } },
          { status: 503 },
        );
      }
    } else {
      console.error("STRIPE_LEDGER_WRITE_FAILED", event.type);
      return NextResponse.json(
        { ok: false, error: { code: "ledger_unavailable" } },
        { status: 503 },
      );
    }
  }

  try {
    let subscription: Stripe.Subscription | null = null;
    let fallback: { userId?: string; workspaceId?: string; plan?: string } = {};
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      fallback = {
        userId:
          session.metadata?.userId || session.client_reference_id || undefined,
        workspaceId: session.metadata?.workspaceId || undefined,
        plan: session.metadata?.plan || undefined,
      };
      if (session.subscription)
        subscription = await getStripe().subscriptions.retrieve(
          String(session.subscription),
        );
    } else if (subscriptionEvents.has(event.type)) {
      subscription = event.data.object as Stripe.Subscription;
    } else if (
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      const subscriptionId = invoiceSubscriptionId(
        event.data.object as Stripe.Invoice,
      );
      if (subscriptionId)
        subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    }

    if (subscription) {
      const record = subscriptionRecord(subscription, event, fallback);
      if (!record) throw new Error("subscription_identity_missing");
      const { data: current } = await admin
        .from("subscriptions")
        .select("last_stripe_event_created")
        .eq("user_id", record.user_id)
        .maybeSingle();
      const lastCreated =
        typeof current?.last_stripe_event_created === "number"
          ? current.last_stripe_event_created
          : null;
      if (shouldApplyStripeEvent(lastCreated, event.created)) {
        const { error } = await admin
          .from("subscriptions")
          .upsert(record, { onConflict: "user_id" });
        if (error) throw error;
      }
    }
    await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", event.id);
    return NextResponse.json({ ok: true, received: true });
  } catch {
    await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "failed",
        processed_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", event.id);
    console.error("STRIPE_WEBHOOK_HANDLER_FAILED", event.type);
    return NextResponse.json(
      { ok: false, error: { code: "webhook_processing_failed" } },
      { status: 500 },
    );
  }
}
