import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  CONNECTOR_OAUTH_STATE_COOKIE,
  connectorOAuthCookieOptions,
  verifyConnectorOAuthState,
} from "@/lib/connectors/oauthState";
import { isOAuthConnectorProvider } from "@/lib/connectors/config";
import { ConnectorRepository } from "@/lib/connectors/repository";
import {
  exchangeGoogleCode,
  getGoogleIdentity,
  GOOGLE_EMAIL_SCOPES,
} from "@/lib/connectors/providers/google";
import {
  exchangeMicrosoftCode,
  getMicrosoftIdentity,
  MICROSOFT_EMAIL_SCOPES,
} from "@/lib/connectors/providers/microsoft";
import {
  exchangeQuickBooksCode,
  getQuickBooksCompanyName,
  QUICKBOOKS_SCOPES,
} from "@/lib/connectors/providers/quickbooks";

function redirect(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set(
    CONNECTOR_OAUTH_STATE_COOKIE,
    "",
    connectorOAuthCookieOptions(0),
  );
  return response;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return redirect(request, "/login");
  const { provider } = await context.params;
  if (!isOAuthConnectorProvider(provider)) {
    return redirect(request, "/connections?connection=unsupported_provider");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const oauthState = verifyConnectorOAuthState({
    cookieValue: cookieStore.get(CONNECTOR_OAUTH_STATE_COOKIE)?.value,
    state,
    userId: user.id,
    provider,
  });
  if (!code || !oauthState) {
    return redirect(request, "/connections?connection=connection_failed");
  }

  try {
    if (provider === "gmail") {
      const tokens = await exchangeGoogleCode({
        code,
        verifier: oauthState.verifier,
      });
      const identity = await getGoogleIdentity(tokens.access_token ?? "");
      await ConnectorRepository.saveOAuthConnection({
        userId: user.id,
        workspaceId: oauthState.workspaceId,
        provider,
        accessToken: tokens.access_token ?? "",
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scopes:
          tokens.scope?.split(/\s+/).filter(Boolean) ?? GOOGLE_EMAIL_SCOPES,
        providerAccountId: identity.sub ?? "",
        providerAccountEmail: identity.email ?? "",
        providerAccountName: identity.name ?? null,
      });
    } else if (provider === "outlook") {
      const tokens = await exchangeMicrosoftCode({
        code,
        verifier: oauthState.verifier,
      });
      const identity = await getMicrosoftIdentity(tokens.access_token ?? "");
      await ConnectorRepository.saveOAuthConnection({
        userId: user.id,
        workspaceId: oauthState.workspaceId,
        provider,
        accessToken: tokens.access_token ?? "",
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scopes:
          tokens.scope?.split(/\s+/).filter(Boolean) ?? MICROSOFT_EMAIL_SCOPES,
        providerAccountId: identity.id,
        providerAccountEmail: identity.email,
        providerAccountName: identity.name,
      });
    } else {
      const realmId = url.searchParams.get("realmId");
      if (!realmId) {
        return redirect(request, "/connections?connection=connection_failed");
      }
      const tokens = await exchangeQuickBooksCode(code);
      const companyName = await getQuickBooksCompanyName({
        realmId,
        accessToken: tokens.access_token,
      });
      const connectionId = await ConnectorRepository.saveOAuthConnection({
        userId: user.id,
        workspaceId: oauthState.workspaceId,
        provider,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scopes: QUICKBOOKS_SCOPES,
        providerAccountId: realmId,
        providerAccountEmail: "",
        providerAccountName: companyName,
        metadata: {
          realmId,
          environment:
            process.env.QUICKBOOKS_ENVIRONMENT === "production"
              ? "production"
              : "sandbox",
        },
      });
      await ConnectorRepository.saveQuickBooksAuthority({
        userId: user.id,
        workspaceId: oauthState.workspaceId,
        providerConnectionId: connectionId,
        realmId,
        companyName,
      });
    }
    return redirect(request, `${oauthState.returnPath}?connection=connected`);
  } catch {
    return redirect(
      request,
      `${oauthState.returnPath}?connection=connection_failed`,
    );
  }
}
