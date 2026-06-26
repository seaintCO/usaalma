import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { moduleAllowed } from "@/lib/modules/plans";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.moduleKey) {
    return NextResponse.json({ error: "Missing moduleKey" }, { status: 400 });
  }

  const subscription = await SubscriptionRepository.get(user.id);
  const plan = subscription?.plan ?? "free";

  if (!moduleAllowed(plan, body.moduleKey)) {
    return NextResponse.json({
      error: "Este módulo no está incluido en tu plan."
    }, { status: 403 });
  }

  const installed = await ModuleRepository.install(user.id, body.moduleKey);

  return NextResponse.json(installed);
}

