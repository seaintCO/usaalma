import { getCurrentUser } from "@/lib/auth/user";
import { OAuthRepository } from "@/lib/db/repositories/oauth/oauth.repository";
import {
  STRIPE_CONNECT_OAUTH_STATE_COOKIE,
  stripeConnectOAuthCookieOptions,
  verifyStripeConnectOAuthState,
} from "@/lib/stripe/connectOAuthState";
import { encryptSecret } from "@/lib/security/crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type StripeConnectTokens = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  stripe_user_id?: string;
  livemode?: boolean;
};
type StripeAccount = {
  id?: string;
  email?: string | null;
  business_profile?: { name?: string | null } | null;
  settings?: { dashboard?: { display_name?: string | null } | null } | null;
};

function redirect(req: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, req.url));
  response.cookies.set(
    STRIPE_CONNECT_OAUTH_STATE_COOKIE,
    "",
    stripeConnectOAuthCookieOptions(0),
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
  const oauthState = verifyStripeConnectOAuthState({
    cookieValue: cookieStore.get(STRIPE_CONNECT_OAUTH_STATE_COOKIE)?.value,
    state,
    userId: user.id,
  });
  if (!code || !oauthState)
    return redirect(req, "/marketplace?stripe=connection_failed");
  try {
    const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY!}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ code, grant_type: "authorization_code" }),
    });
    const tokens = (await tokenRes.json()) as StripeConnectTokens;
    if (!tokenRes.ok || !tokens.access_token || !tokens.stripe_user_id)
      return redirect(req, "/marketplace?stripe=connection_failed");
    const accountRes = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const account = (await accountRes.json()) as StripeAccount;
    const accountId = account.id ?? tokens.stripe_user_id;
    if (!accountRes.ok || !accountId)
      return redirect(req, "/marketplace?stripe=connection_failed");
    const existing = await OAuthRepository.getStripeConnectConnection(user.id);
    await OAuthRepository.saveStripeConnectConnection({
      userId: user.id,
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : (existing?.refresh_token ?? null),
      scopes: tokens.scope ?? null,
      accountId,
      accountEmail: account.email ?? null,
      accountLabel:
        account.business_profile?.name ??
        account.settings?.dashboard?.display_name ??
        null,
      liveMode: typeof tokens.livemode === "boolean" ? tokens.livemode : null,
    });
    return redirect(req, `${oauthState.returnPath}?stripe=connected`);
  } catch {
    return redirect(req, "/marketplace?stripe=connection_failed");
  }
}
