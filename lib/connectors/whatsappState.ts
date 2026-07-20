import crypto from "crypto";
import { requireEnv } from "@/lib/config/env";

const TTL_MS = 10 * 60 * 1000;
export const WHATSAPP_STATE_COOKIE = "alma_whatsapp_signup_state";

type WhatsAppState = {
  state: string;
  userId: string;
  workspaceId: string;
  returnPath: "/connections" | "/communications";
  expiresAt: number;
};

function sign(value: string) {
  return crypto
    .createHmac("sha256", requireEnv("APP_ENCRYPTION_KEY"))
    .update(value)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function encode(payload: WhatsAppState) {
  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${serialized}.${sign(serialized)}`;
}

function decode(value: string | undefined) {
  if (!value) return null;
  const [serialized, signature] = value.split(".");
  if (!serialized || !signature || !safeEqual(signature, sign(serialized))) {
    return null;
  }
  const state = JSON.parse(
    Buffer.from(serialized, "base64url").toString("utf8"),
  ) as WhatsAppState;
  return state.expiresAt > Date.now() ? state : null;
}

export function createWhatsAppState(input: {
  userId: string;
  workspaceId: string;
  returnPath: "/connections" | "/communications";
}) {
  const state: WhatsAppState = {
    state: crypto.randomBytes(32).toString("base64url"),
    userId: input.userId,
    workspaceId: input.workspaceId,
    returnPath: input.returnPath,
    expiresAt: Date.now() + TTL_MS,
  };
  return {
    state: state.state,
    cookieValue: encode(state),
    maxAgeSeconds: Math.floor(TTL_MS / 1000),
  };
}

export function verifyWhatsAppState(input: {
  cookieValue: string | undefined;
  state: string | null;
  userId: string;
}) {
  const payload = decode(input.cookieValue);
  if (!payload || !input.state) return null;
  if (
    payload.userId !== input.userId ||
    !safeEqual(payload.state, input.state)
  ) {
    return null;
  }
  return payload;
}

export function whatsappStateCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/connectors/whatsapp",
    maxAge,
  };
}
