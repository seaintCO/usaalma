import { createClient } from "@/lib/supabase/server";
import type { BillingSubscription } from "@/lib/billing/types";

export class SubscriptionRepository {
  static async get(userId: string): Promise<BillingSubscription | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return {
      plan: typeof data.plan === "string" ? data.plan : "free",
      status: typeof data.status === "string" ? data.status : "inactive",
      stripeCustomerId:
        typeof data.stripe_customer_id === "string"
          ? data.stripe_customer_id
          : null,
      stripeSubscriptionId:
        typeof data.stripe_subscription_id === "string"
          ? data.stripe_subscription_id
          : null,
      priceId: typeof data.price_id === "string" ? data.price_id : null,
      currentPeriodEnd:
        typeof data.current_period_end === "string"
          ? data.current_period_end
          : null,
      cancelAtPeriodEnd: data.cancel_at_period_end === true,
    };
  }

  static async upsert(userId: string, data: Record<string, unknown>) {
    const supabase = await createClient();
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        stripe_customer_id: data.customer,
        stripe_subscription_id: data.subscription,
        plan: data.plan,
        status: data.status,
        current_period_end: data.currentPeriodEnd,
      })
      .select()
      .single();
    if (error) throw error;
    return subscription;
  }
}
