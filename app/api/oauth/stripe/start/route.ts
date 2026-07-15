import { getCurrentUser } from "@/lib/auth/user";
import {
  createStripeConnectOAuthState,
  STRIPE_CONNECT_OAUTH_STATE_COOKIE,
  stripeConnectOAuthCookieOptions,
} from "@/lib/stripe/connectOAuthState";
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
    requestedReturnPath === "/marketplace" ? "/marketplace" : "/marketplace";
  const state = createStripeConnectOAuthState(user.id, returnPath);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: "read_write",
    redirect_uri: process.env.STRIPE_REDIRECT_URI!,
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
