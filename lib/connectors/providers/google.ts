import { getConnectorCallbackUrl } from "../config";
import { ConnectorRepository } from "../repository";

export const GOOGLE_EMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
];

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleIdentity = {
  sub?: string;
  email?: string;
  name?: string;
};

export function createGoogleAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
}) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: getConnectorCallbackUrl("gmail"),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    scope: GOOGLE_EMAIL_SCOPES.join(" "),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(input: {
  code: string;
  verifier: string;
}) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: getConnectorCallbackUrl("gmail"),
      grant_type: "authorization_code",
      code_verifier: input.verifier,
    }),
  });
  const tokens = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !tokens.access_token) {
    throw new Error(tokens.error ?? "google_token_exchange_failed");
  }
  return tokens;
}

export async function getGoogleIdentity(accessToken: string) {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const identity = (await response.json()) as GoogleIdentity;
  if (!response.ok || !identity.email || !identity.sub) {
    throw new Error("google_identity_failed");
  }
  return identity;
}

export async function refreshGoogleAccessToken(input: {
  connectionId: string;
  refreshToken: string;
}) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: input.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokens = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !tokens.access_token) {
    await ConnectorRepository.markConnectionError({
      connectionId: input.connectionId,
      status: "reauthorization_required",
      code: tokens.error ?? "google_refresh_failed",
      message: "Gmail reauthorization required.",
    });
    throw new Error("gmail_reauthorization_required");
  }
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;
  await ConnectorRepository.updateRefreshedToken({
    connectionId: input.connectionId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt,
  });
  return tokens.access_token;
}

function base64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildMime(input: {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string | null;
}) {
  const headers = [
    `To: ${input.to}`,
    ...(input.cc?.length ? [`Cc: ${input.cc.join(", ")}`] : []),
    ...(input.bcc?.length ? [`Bcc: ${input.bcc.join(", ")}`] : []),
    `Subject: ${input.subject}`,
  ];
  if (input.html) {
    return [
      ...headers,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      input.html,
    ].join("\r\n");
  }
  return [
    ...headers,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.text,
  ].join("\r\n");
}

export async function sendGmailMessage(input: {
  accessToken: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string | null;
}) {
  const raw = base64Url(buildMime(input));
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );
  const data = (await response.json()) as { id?: string; error?: unknown };
  if (!response.ok || !data.id) {
    throw new Error("gmail_send_failed");
  }
  return { messageId: data.id };
}

export async function revokeGoogleToken(token: string) {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
}
