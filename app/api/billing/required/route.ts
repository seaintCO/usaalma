import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ required:true, reason:"unauthorized" }, { status:401 });
  }

  const subscription = await SubscriptionRepository.get(user.id);

  const active =
    subscription &&
    ["active", "trialing"].includes(subscription.status);

  return NextResponse.json({
    required: !active,
    plan: subscription?.plan ?? "free",
    status: subscription?.status ?? "inactive",
  });
}
