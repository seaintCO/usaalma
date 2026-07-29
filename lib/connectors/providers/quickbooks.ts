import { getConnectorCallbackUrl } from "@/lib/connectors/config";

export const QUICKBOOKS_SCOPES = ["com.intuit.quickbooks.accounting"];

function environment() {
  return process.env.QUICKBOOKS_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";
}

function clientId() {
  return process.env.QUICKBOOKS_CLIENT_ID ?? "";
}

function clientSecret() {
  return process.env.QUICKBOOKS_CLIENT_SECRET ?? "";
}

export function createQuickBooksAuthorizationUrl(input: { state: string }) {
  const url = new URL("https://appcenter.intuit.com/connect/oauth2");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", QUICKBOOKS_SCOPES.join(" "));
  url.searchParams.set("redirect_uri", getConnectorCallbackUrl("quickbooks"));
  url.searchParams.set("state", input.state);
  return url;
}

export async function exchangeQuickBooksCode(code: string) {
  const authorization = Buffer.from(`${clientId()}:${clientSecret()}`).toString(
    "base64",
  );
  const response = await fetch(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    {
      method: "POST",
      headers: {
        authorization: `Basic ${authorization}`,
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getConnectorCallbackUrl("quickbooks"),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) throw new Error("quickbooks_token_exchange_failed");
  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    x_refresh_token_expires_in?: number;
  };
}

export async function getQuickBooksCompanyName(input: {
  realmId: string;
  accessToken: string;
}) {
  const host =
    environment() === "production"
      ? "quickbooks.api.intuit.com"
      : "sandbox-quickbooks.api.intuit.com";
  const response = await fetch(
    `https://${host}/v3/company/${encodeURIComponent(input.realmId)}/companyinfo/${encodeURIComponent(input.realmId)}?minorversion=75`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    CompanyInfo?: { CompanyName?: string };
  };
  return payload.CompanyInfo?.CompanyName ?? null;
}
