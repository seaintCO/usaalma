import { OAuthRepository } from "@/lib/db/repositories/oauth/oauth.repository";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

function maybeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    if (value.includes(":")) return decryptSecret(value);
    return value;
  } catch {
    return value;
  }
}

export async function getGoogleAccessToken(userId: string) {
  const connection = await OAuthRepository.getGoogleWorkspaceConnection(userId);
  if (!connection?.connected || connection.connection_status !== "connected") {
    throw new Error("Google is not connected.");
  }

  const expiresAt = connection.expires_at
    ? new Date(connection.expires_at).getTime()
    : 0;

  const shouldRefresh = !expiresAt || expiresAt < Date.now() + 60_000;

  if (!shouldRefresh && connection.access_token) {
    return maybeDecrypt(connection.access_token);
  }

  const refreshToken = maybeDecrypt(connection.refresh_token);

  if (!refreshToken) {
    await OAuthRepository.markGoogleWorkspaceReconnectRequired(
      userId,
      "refresh_token_missing",
    );
    throw new Error(
      "Google refresh token missing. Reconnect Google Workspace.",
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok || !tokens.access_token) {
    await OAuthRepository.markGoogleWorkspaceReconnectRequired(
      userId,
      "token_refresh_rejected",
    );
    throw new Error("Google token refresh failed.");
  }

  await OAuthRepository.markGoogleWorkspaceRefresh({
    userId,
    accessToken: encryptSecret(tokens.access_token),
    expiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
  });

  return tokens.access_token;
}
