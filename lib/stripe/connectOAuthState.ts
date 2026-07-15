import crypto from "crypto";
import { requireEnv } from "@/lib/config/env";

const STATE_TTL_MS = 10 * 60 * 1000;
export const STRIPE_CONNECT_OAUTH_STATE_COOKIE =
  "alma_stripe_connect_oauth_state";

type StripeConnectState = {
  state: string;
  userId: string;
  returnPath: "/marketplace";
  expiresAt: number;
};

function sign(payload: string) {
  return crypto
    .createHmac("sha256", requireEnv("APP_ENCRYPTION_KEY"))
    .update(payload)
    .digest("base64url");
}

function matches(left: string, right: string) {
  const leftValue = Buffer.from(left);
  const rightValue = Buffer.from(right);
  return (
    leftValue.length === rightValue.length &&
    crypto.timingSafeEqual(leftValue, rightValue)
  );
}

function decode(value: string): StripeConnectState | null {
  const [serialized, signature] = value.split(".");
  if (!serialized || !signature || !matches(signature, sign(serialized)))
    return null;
  try {
    const state = JSON.parse(
      Buffer.from(serialized, "base64url").toString("utf8"),
    ) as StripeConnectState;
    if (
      !state.state ||
      !state.userId ||
      state.returnPath !== "/marketplace" ||
      state.expiresAt <= Date.now()
    )
      return null;
    return state;
  } catch {
    return null;
  }
}

export function createStripeConnectOAuthState(
  userId: string,
  returnPath: "/marketplace",
) {
  const payload: StripeConnectState = {
    state: crypto.randomBytes(32).toString("base64url"),
    userId,
    returnPath,
    expiresAt: Date.now() + STATE_TTL_MS,
  };
  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    state: payload.state,
    cookieValue: `${serialized}.${sign(serialized)}`,
    maxAgeSeconds: Math.floor(STATE_TTL_MS / 1000),
  };
}

export function verifyStripeConnectOAuthState(input: {
  cookieValue: string | undefined;
  state: string | null;
  userId: string;
}) {
  if (!input.cookieValue || !input.state) return null;
  const payload = decode(input.cookieValue);
  if (
    !payload ||
    payload.userId !== input.userId ||
    !matches(payload.state, input.state)
  )
    return null;
  return payload;
}

export function stripeConnectOAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/oauth/stripe",
    maxAge,
  };
}
