import { createClient } from "@/lib/supabase/server";

export class SubscriptionRepository {
  static async get(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    return data;
  }

  static async upsert(userId:string, data:any) {
    const supabase = await createClient();

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .upsert({
        user_id:userId,
        stripe_customer_id:data.stripeCustomerId,
        stripe_subscription_id:data.stripeSubscriptionId,
        plan:data.plan,
        status:data.status,
        current_period_end:data.currentPeriodEnd,
      })
      .select()
      .single();

    if (error) throw error;

    return subscription;
  }
}
