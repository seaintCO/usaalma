import { getCurrentUser } from "@/lib/auth/user";
import { OAuthRepository } from "@/lib/db/repositories/oauth/oauth.repository";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  googleOAuthCookieOptions,
  verifyGoogleOAuthState,
} from "@/lib/google/oauthState";
import { encryptSecret } from "@/lib/security/crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type GoogleTokens = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};
type GoogleUserInfo = {
  sub?: string;
  email?: string;
  verified_email?: boolean;
};

function redirect(req: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, req.url));
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    "",
    googleOAuthCookieOptions(0),
  );
  return response;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return redirect(req, "/login");
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const oauthState = verifyGoogleOAuthState({
    cookieValue: cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value,
    state,
    userId: user.id,
  });
  if (!code || !oauthState)
    return redirect(req, "/marketplace?google=connection_failed");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
        code_verifier: oauthState.verifier,
      }),
    });
    const tokens = (await tokenRes.json()) as GoogleTokens;
    if (!tokenRes.ok || !tokens.access_token)
      return redirect(req, "/marketplace?google=connection_failed");
    const identityRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const identity = (await identityRes.json()) as GoogleUserInfo;
    if (!identityRes.ok || !identity.email || !identity.sub)
      return redirect(req, "/marketplace?google=connection_failed");
    const existing = await OAuthRepository.getGoogleWorkspaceConnection(
      user.id,
    );
    await OAuthRepository.saveGoogleWorkspaceConnection({
      userId: user.id,
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : (existing?.refresh_token ?? null),
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      scopes: tokens.scope ?? null,
      accountEmail: identity.email,
      accountId: identity.sub,
    });
    return redirect(req, `${oauthState.returnPath}?google=connected`);
  } catch {
    return redirect(req, "/marketplace?google=connection_failed");
  }
}
