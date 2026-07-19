import crypto from "crypto";
import { requireEnv } from "@/lib/config/env";

const STATE_TTL_MS = 10 * 60 * 1000;

export const GITHUB_APP_STATE_COOKIE = "alma_github_app_state";

type GitHubAppState = {
  state: string;
  userId: string;
  workspaceId: string;
  returnPath: "/connections" | "/builder" | "/marketplace";
  expiresAt: number;
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

function encode(payload: GitHubAppState) {
  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${serialized}.${sign(serialized)}`;
}

function decode(cookieValue: string): GitHubAppState | null {
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
    ) as GitHubAppState;
    if (
      !state.state ||
      !state.userId ||
      !state.workspaceId ||
      state.expiresAt <= Date.now()
    ) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function cleanGitHubReturnPath(value: string | null) {
  if (value === "/builder" || value === "/marketplace") return value;
  return "/connections";
}

export function createGitHubAppState(input: {
  userId: string;
  workspaceId: string;
  returnPath: "/connections" | "/builder" | "/marketplace";
}) {
  const state: GitHubAppState = {
    state: crypto.randomBytes(32).toString("base64url"),
    userId: input.userId,
    workspaceId: input.workspaceId,
    returnPath: input.returnPath,
    expiresAt: Date.now() + STATE_TTL_MS,
  };
  return {
    state: state.state,
    cookieValue: encode(state),
    maxAgeSeconds: Math.floor(STATE_TTL_MS / 1000),
  };
}

export function verifyGitHubAppState(input: {
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

export function githubAppStateCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/connectors/github",
    maxAge,
  };
}
