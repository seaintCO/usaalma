import { getConnectorCallbackUrl } from "../config";
import { ConnectorRepository } from "../repository";

export const MICROSOFT_EMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "User.Read",
  "Mail.Send",
];

type MicrosoftTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type MicrosoftIdentity = {
  id?: string;
  mail?: string | null;
  userPrincipalName?: string | null;
  displayName?: string | null;
};

export function createMicrosoftAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
}) {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    redirect_uri: getConnectorCallbackUrl("outlook"),
    response_type: "code",
    response_mode: "query",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    scope: MICROSOFT_EMAIL_SCOPES.join(" "),
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeMicrosoftCode(input: {
  code: string;
  verifier: string;
}) {
  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        redirect_uri: getConnectorCallbackUrl("outlook"),
        grant_type: "authorization_code",
        code_verifier: input.verifier,
      }),
    },
  );
  const tokens = (await response.json()) as MicrosoftTokenResponse;
  if (!response.ok || !tokens.access_token) {
    throw new Error(tokens.error ?? "microsoft_token_exchange_failed");
  }
  return tokens;
}

export async function getMicrosoftIdentity(accessToken: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const identity = (await response.json()) as MicrosoftIdentity;
  const email = identity.mail ?? identity.userPrincipalName;
  if (!response.ok || !identity.id || !email) {
    throw new Error("microsoft_identity_failed");
  }
  return {
    id: identity.id,
    email,
    name: identity.displayName ?? null,
  };
}

export async function refreshMicrosoftAccessToken(input: {
  connectionId: string;
  refreshToken: string;
}) {
  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        refresh_token: input.refreshToken,
        grant_type: "refresh_token",
        scope: MICROSOFT_EMAIL_SCOPES.join(" "),
      }),
    },
  );
  const tokens = (await response.json()) as MicrosoftTokenResponse;
  if (!response.ok || !tokens.access_token) {
    await ConnectorRepository.markConnectionError({
      connectionId: input.connectionId,
      status: "reauthorization_required",
      code: tokens.error ?? "microsoft_refresh_failed",
      message: "Outlook reauthorization required.",
    });
    throw new Error("outlook_reauthorization_required");
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

export async function sendOutlookMessage(input: {
  accessToken: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string | null;
}) {
  const recipient = (address: string) => ({ emailAddress: { address } });
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: {
          contentType: input.html ? "HTML" : "Text",
          content: input.html ?? input.text,
        },
        toRecipients: [recipient(input.to)],
        ccRecipients: input.cc?.map(recipient) ?? [],
        bccRecipients: input.bcc?.map(recipient) ?? [],
      },
      saveToSentItems: true,
    }),
  });
  if (!response.ok) {
    throw new Error("outlook_send_failed");
  }
  return { messageId: `outlook-${Date.now()}` };
}
