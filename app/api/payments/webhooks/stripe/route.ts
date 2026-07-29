import Stripe from "stripe";
import {
  settleOfficePayment,
  stripeCheckoutPaymentDetails,
} from "@/lib/payments/officePaymentLinks";
import { getStripe } from "@/lib/stripe/server";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return Response.json(
      { ok: false, error: "webhook_configuration_required" },
      { status: 503 },
    );
  }
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return Response.json(
      { ok: false, error: "invalid_signature" },
      { status: 400 },
    );
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const details = stripeCheckoutPaymentDetails(session);
      if (details.paymentLinkId) {
        try {
          await settleOfficePayment({
            paymentLinkId: details.paymentLinkId,
            provider: "stripe_connect",
            providerEventId: event.id,
            eventType: event.type,
            providerCheckoutId: details.providerCheckoutId,
            providerAccountId:
              typeof event.account === "string" ? event.account : undefined,
            amount: details.amount,
            currency: details.currency,
          });
        } catch {
          return Response.json(
            { ok: false, error: "payment_reconciliation_failed" },
            { status: 503 },
          );
        }
      }
    }
  }
  return Response.json({ ok: true });
}
