import { getCurrentUser } from "@/lib/auth/user";
import { OAuthRepository } from "@/lib/db/repositories/oauth/oauth.repository";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      {
        ok: false,
        error: { code: "unauthorized", message: "Authentication is required." },
      },
      { status: 401 },
    );
  try {
    const connection = await OAuthRepository.getStripeConnectConnection(
      user.id,
    );
    if (!connection)
      return NextResponse.json({ ok: true, disconnected: false });
    if (connection.provider_account_id) {
      try {
        await fetch("https://connect.stripe.com/oauth/deauthorize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY!}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: process.env.STRIPE_CLIENT_ID!,
            stripe_user_id: connection.provider_account_id,
          }),
        });
      } catch {
        // Local encrypted credentials are invalidated even if Stripe is unavailable.
      }
    }
    await OAuthRepository.disconnectStripeConnect(user.id);
    return NextResponse.json({ ok: true, disconnected: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "disconnect_failed",
          message: "Stripe could not be disconnected.",
        },
      },
      { status: 503 },
    );
  }
}
