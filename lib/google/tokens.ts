import { createClient } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

function maybeDecrypt(value:string | null) {
  if (!value) return "";
  try {
    if (value.includes(":")) return decryptSecret(value);
    return value;
  } catch {
    return value;
  }
}

export async function getGoogleAccessToken(userId:string) {
  const supabase = await createClient();

  const { data: connection, error } = await supabase
    .from("oauth_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error || !connection?.connected) {
    throw new Error("Google is not connected.");
  }

  const expiresAt = connection.expires_at
    ? new Date(connection.expires_at).getTime()
    : 0;

  const shouldRefresh = expiresAt && expiresAt < Date.now() + 60_000;

  if (!shouldRefresh) {
    return maybeDecrypt(connection.access_token);
  }

  const refreshToken = maybeDecrypt(connection.refresh_token);

  if (!refreshToken) {
    throw new Error("Google refresh token missing. Reconnect Gmail.");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body:new URLSearchParams({
      client_id:process.env.GOOGLE_CLIENT_ID!,
      client_secret:process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token:refreshToken,
      grant_type:"refresh_token",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok || !tokens.access_token) {
    throw new Error("Google token refresh failed.");
  }

  await supabase
    .from("oauth_connections")
    .update({
      access_token:encryptSecret(tokens.access_token),
      expires_at:tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      metadata:{
        ...(connection.metadata ?? {}),
        encrypted:true,
        refreshed_at:new Date().toISOString(),
      },
    })
    .eq("id", connection.id);

  return tokens.access_token;
}
