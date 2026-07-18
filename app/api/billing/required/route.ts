import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, required: false, reason: "unauthorized" },
      { status: 401 },
    );
  }

  if (process.env.NEXT_PUBLIC_BETA_MODE === "true") {
    return NextResponse.json({
      ok: true,
      required: false,
      plan: "beta",
      status: "trialing",
    });
  }

  try {
    const subscription = await SubscriptionRepository.get(user.id);
    const active =
      subscription && ["active", "trialing"].includes(subscription.status);

    return NextResponse.json({
      ok: true,
      required: !active,
      plan: subscription?.plan ?? "free",
      status: subscription?.status ?? "inactive",
    });
  } catch {
    return NextResponse.json(
      { ok: false, required: false, reason: "billing_unavailable" },
      { status: 503 },
    );
  }
}
