import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";

function failure(code: string, status: number) {
  return NextResponse.json({ ok: false, error: { code } }, { status });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return failure("authentication_required", 401);
  const { data, error } = await createAdminClient()
    .from("voice_agent_setup_orders")
    .select(
      "id,status,amount,currency,booking_url,booked_at,completed_at,created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error)
    return failure(
      error.code === "42P01"
        ? "voice_setup_schema_unavailable"
        : "voice_setup_unavailable",
      503,
    );
  return NextResponse.json({
    ok: true,
    order: data ?? null,
    bookingUrl: process.env.ALMA_VOICE_SETUP_BOOKING_URL || null,
    managedSetupRequired: process.env.ALMA_VOICE_SETUP_REQUIRED === "true",
    price: { amount: 299, currency: "USD", type: "one_time" },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return failure("authentication_required", 401);
  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_APP_URL) {
    return failure("voice_setup_checkout_not_configured", 503);
  }
  const body = await request.json().catch(() => ({}));
  const tenant = await resolveTenantWorkspace({
    userId: user.id,
    workspaceId: body.workspaceId,
  });
  const admin = createAdminClient();
  const bookingUrl = process.env.ALMA_VOICE_SETUP_BOOKING_URL || null;
  const { data: order, error: orderError } = await admin
    .from("voice_agent_setup_orders")
    .insert({
      user_id: user.id,
      workspace_id: tenant.workspaceId,
      booking_url: bookingUrl,
      amount: 29900,
      currency: "usd",
    })
    .select("id")
    .single();
  if (orderError)
    return failure(
      orderError.code === "42P01"
        ? "voice_setup_schema_unavailable"
        : "voice_setup_order_failed",
      503,
    );

  try {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
    const priceId = process.env.STRIPE_PRICE_VOICE_AGENT_SETUP;
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        customer_email: user.email ?? undefined,
        client_reference_id: user.id,
        line_items: [
          priceId
            ? { price: priceId, quantity: 1 }
            : {
                price_data: {
                  currency: "usd",
                  unit_amount: 29900,
                  product_data: {
                    name: "ALMA Managed Voice Agent Setup",
                    description:
                      "One-time guided setup for a customer-owned ElevenLabs voice agent.",
                  },
                },
                quantity: 1,
              },
        ],
        metadata: {
          purchase: "voice_agent_setup",
          orderId: order.id,
          userId: user.id,
          workspaceId: tenant.workspaceId ?? "",
        },
        success_url: `${appUrl}/voice-agents?setup=success`,
        cancel_url: `${appUrl}/voice-agents?setup=cancelled`,
      },
      { idempotencyKey: `alma_voice_setup_${order.id}` },
    );
    if (!session.url) throw new Error("checkout_url_missing");
    await admin
      .from("voice_agent_setup_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id)
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true, url: session.url });
  } catch {
    await admin
      .from("voice_agent_setup_orders")
      .update({ status: "cancelled" })
      .eq("id", order.id)
      .eq("user_id", user.id);
    return failure("voice_setup_checkout_unavailable", 503);
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return failure("authentication_required", 401);
  const body = await request.json().catch(() => ({}));
  if (body.action !== "booked") return failure("unsupported_action", 400);
  const { data, error } = await createAdminClient()
    .from("voice_agent_setup_orders")
    .update({ status: "call_booked", booked_at: new Date().toISOString() })
    .eq("id", String(body.orderId || ""))
    .eq("user_id", user.id)
    .eq("status", "paid")
    .select("id,status,booked_at")
    .single();
  if (error) return failure("voice_setup_update_failed", 409);
  return NextResponse.json({ ok: true, order: data });
}
