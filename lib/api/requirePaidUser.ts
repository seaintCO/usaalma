import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

export async function requirePaidUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user:null,
      error:NextResponse.json({ error:"Unauthorized" }, { status:401 })
    };
  }

  const subscription = await SubscriptionRepository.get(user.id);

  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return {
      user:null,
      error:NextResponse.json({ error:"Subscription required" }, { status:402 })
    };
  }

  return { user, error:null };
}
