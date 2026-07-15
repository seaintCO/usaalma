import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/user";

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?stripe=missing_code", req.url),
    );
  }

  const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  const supabase = createAdminClient();

  await supabase.from("oauth_connections").upsert({
    user_id: user.id,
    provider: "stripe",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scopes: tokens.scope,
    connected: true,
    metadata: {
      stripe_user_id: tokens.stripe_user_id,
      livemode: tokens.livemode,
    },
  });

  return NextResponse.redirect(new URL("/settings?stripe=connected", req.url));
}
