import type Stripe from "stripe";
import { planFromPriceId, normalizeBillingPlan } from "./plans";

export function shouldApplyStripeEvent(
  lastCreated: number | null,
  incomingCreated: number,
) {
  return lastCreated === null || incomingCreated >= lastCreated;
}

export function subscriptionRecord(
  subscription: Stripe.Subscription,
  event: Pick<Stripe.Event, "id" | "created" | "type">,
  fallback: { userId?: string; workspaceId?: string; plan?: string } = {},
) {
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const userId = subscription.metadata.userId || fallback.userId;
  const workspaceId =
    subscription.metadata.workspaceId || fallback.workspaceId || null;
  const plan =
    normalizeBillingPlan(subscription.metadata.plan || fallback.plan) ||
    planFromPriceId(priceId);
  if (!userId || !plan) return null;
  const seconds = (value: number | null | undefined) =>
    value ? new Date(value * 1000).toISOString() : null;
  return {
    user_id: userId,
    workspace_id: workspaceId || null,
    stripe_customer_id: String(subscription.customer),
    stripe_subscription_id: subscription.id,
    price_id: priceId,
    plan,
    status: subscription.status,
    current_period_start: seconds(item?.current_period_start),
    current_period_end: seconds(item?.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_end: seconds(subscription.trial_end),
    payment_failed_at:
      event.type === "invoice.payment_failed" ||
      ["past_due", "unpaid"].includes(subscription.status)
        ? new Date(event.created * 1000).toISOString()
        : null,
    last_stripe_event_id: event.id,
    last_stripe_event_created: event.created,
    updated_at: new Date().toISOString(),
  };
}
