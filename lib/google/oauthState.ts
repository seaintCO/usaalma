import crypto from "crypto";
import { requireEnv } from "@/lib/config/env";

const STATE_TTL_MS = 10 * 60 * 1000;

export const GOOGLE_OAUTH_STATE_COOKIE = "alma_google_oauth_state";

type GoogleOAuthState = {
  state: string;
  userId: string;
  returnPath: "/marketplace";
  expiresAt: number;
  verifier: string;
};

function sign(payload: string) {
  return crypto
    .createHmac("sha256", requireEnv("APP_ENCRYPTION_KEY"))
    .update(payload)
    .digest("base64url");
}

function safelyMatches(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function encode(payload: GoogleOAuthState) {
  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${serialized}.${sign(serialized)}`;
}

function decode(cookieValue: string): GoogleOAuthState | null {
  const [serialized, signature] = cookieValue.split(".");
  if (
    !serialized ||
    !signature ||
    !safelyMatches(signature, sign(serialized))
  ) {
    return null;
  }
  try {
    const state = JSON.parse(
      Buffer.from(serialized, "base64url").toString("utf8"),
    ) as GoogleOAuthState;
    if (
      !state.state ||
      !state.userId ||
      !state.verifier ||
      state.returnPath !== "/marketplace" ||
      state.expiresAt <= Date.now()
    ) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function createGoogleOAuthState(
  userId: string,
  returnPath: "/marketplace",
) {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const state: GoogleOAuthState = {
    state: crypto.randomBytes(32).toString("base64url"),
    userId,
    returnPath,
    expiresAt: Date.now() + STATE_TTL_MS,
    verifier,
  };
  return {
    state: state.state,
    codeChallenge: crypto
      .createHash("sha256")
      .update(verifier)
      .digest("base64url"),
    cookieValue: encode(state),
    maxAgeSeconds: Math.floor(STATE_TTL_MS / 1000),
  };
}

export function verifyGoogleOAuthState(input: {
  cookieValue: string | undefined;
  state: string | null;
  userId: string;
}) {
  if (!input.cookieValue || !input.state) return null;
  const payload = decode(input.cookieValue);
  if (!payload) return null;
  if (
    payload.userId !== input.userId ||
    !safelyMatches(payload.state, input.state)
  ) {
    return null;
  }
  return payload;
}

export function googleOAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/oauth/google",
    maxAge,
  };
}
