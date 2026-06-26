import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

export async function userHasActiveSubscription(userId:string) {
  const subscription = await SubscriptionRepository.get(userId);

  if (!subscription) return false;

  return ["active", "trialing"].includes(subscription.status);
}
