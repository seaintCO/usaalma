import { getCurrentUser } from "@/lib/auth/user";
import {
  createStripeConnectOAuthState,
  STRIPE_CONNECT_OAUTH_STATE_COOKIE,
  stripeConnectOAuthCookieOptions,
} from "@/lib/stripe/connectOAuthState";
import { getAppBaseUrl } from "@/lib/connectors/config";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }
  const requestedReturnPath = new URL(req.url).searchParams.get("returnTo");
  const returnPath =
    requestedReturnPath === "/onboarding"
      ? "/onboarding"
      : requestedReturnPath === "/connections"
        ? "/connections"
        : "/marketplace";
  const baseUrl = getAppBaseUrl();
  const missingConfiguration =
    !process.env.STRIPE_CLIENT_ID ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.APP_ENCRYPTION_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !baseUrl;
  if (missingConfiguration) {
    const target = new URL(returnPath, req.url);
    target.searchParams.set("stripe", "configuration_required");
    return NextResponse.redirect(target);
  }
  const state = createStripeConnectOAuthState(user.id, returnPath);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: "read_write",
    redirect_uri: `${baseUrl}/api/oauth/stripe/callback`,
    state: state.state,
  });
  const response = NextResponse.redirect(
    `https://connect.stripe.com/oauth/authorize?${params.toString()}`,
  );
  response.cookies.set(
    STRIPE_CONNECT_OAUTH_STATE_COOKIE,
    state.cookieValue,
    stripeConnectOAuthCookieOptions(state.maxAgeSeconds),
  );
  return response;
}
