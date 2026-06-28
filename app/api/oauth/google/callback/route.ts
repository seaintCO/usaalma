import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { encryptSecret } from "@/lib/security/crypto";

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/settings?google=missing_code", req.url));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok || !tokens.access_token) {
    return NextResponse.redirect(new URL("/settings?google=failed", req.url));
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("oauth_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .maybeSingle();

  const refreshToken = tokens.refresh_token
    ? encryptSecret(tokens.refresh_token)
    : existing?.refresh_token ?? null;

  await supabase.from("oauth_connections").upsert(
    {
      user_id: user.id,
      provider: "google",
      access_token: encryptSecret(tokens.access_token),
      refresh_token: refreshToken,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      scopes: tokens.scope,
      connected: true,
      metadata: {
        token_type: tokens.token_type,
        encrypted: true,
        connected_at: new Date().toISOString(),
      },
    },
    { onConflict: "user_id,provider" }
  );

  return NextResponse.redirect(new URL("/settings?google=connected", req.url));
}
