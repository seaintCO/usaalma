import crypto from "crypto";
import { requireEnv } from "@/lib/config/env";
import type { EmailConnectorProvider } from "./types";

const STATE_TTL_MS = 10 * 60 * 1000;

export const CONNECTOR_OAUTH_STATE_COOKIE = "alma_connector_oauth_state";

type ConnectorOAuthState = {
  state: string;
  userId: string;
  workspaceId: string;
  provider: EmailConnectorProvider;
  returnPath: "/connections" | "/office" | "/marketplace";
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

function encode(payload: ConnectorOAuthState) {
  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${serialized}.${sign(serialized)}`;
}

function decode(cookieValue: string): ConnectorOAuthState | null {
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
    ) as ConnectorOAuthState;
    if (
      !state.state ||
      !state.userId ||
      !state.workspaceId ||
      !state.provider ||
      !state.verifier ||
      state.expiresAt <= Date.now()
    ) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function cleanReturnPath(value: string | null) {
  if (value === "/office" || value === "/marketplace") return value;
  return "/connections";
}

export function createConnectorOAuthState(input: {
  userId: string;
  workspaceId: string;
  provider: EmailConnectorProvider;
  returnPath: "/connections" | "/office" | "/marketplace";
}) {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const state: ConnectorOAuthState = {
    state: crypto.randomBytes(32).toString("base64url"),
    userId: input.userId,
    workspaceId: input.workspaceId,
    provider: input.provider,
    returnPath: input.returnPath,
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

export function verifyConnectorOAuthState(input: {
  cookieValue: string | undefined;
  state: string | null;
  userId: string;
  provider: EmailConnectorProvider;
}) {
  if (!input.cookieValue || !input.state) return null;
  const payload = decode(input.cookieValue);
  if (!payload) return null;
  if (
    payload.userId !== input.userId ||
    payload.provider !== input.provider ||
    !safelyMatches(payload.state, input.state)
  ) {
    return null;
  }
  return payload;
}

export function connectorOAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/connectors/oauth",
    maxAge,
  };
}
