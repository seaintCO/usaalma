import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  CONNECTOR_OAUTH_STATE_COOKIE,
  cleanReturnPath,
  connectorOAuthCookieOptions,
  createConnectorOAuthState,
} from "@/lib/connectors/oauthState";
import {
  getMissingConnectorEnv,
  isEmailConnectorProvider,
} from "@/lib/connectors/config";
import { ConnectorRepository } from "@/lib/connectors/repository";
import { createGoogleAuthorizationUrl } from "@/lib/connectors/providers/google";
import { createMicrosoftAuthorizationUrl } from "@/lib/connectors/providers/microsoft";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const { provider } = await context.params;
  if (!isEmailConnectorProvider(provider)) {
    return NextResponse.json(
      { ok: false, error: { code: "unsupported_provider" } },
      { status: 404 },
    );
  }
  const returnPath = cleanReturnPath(
    new URL(request.url).searchParams.get("returnTo"),
  );
  const missing = getMissingConnectorEnv(provider);
  if (missing.length) {
    return NextResponse.redirect(
      new URL(`${returnPath}?connection=configuration_required`, request.url),
    );
  }
  try {
    const workspaceId = await ConnectorRepository.resolveDefaultWorkspaceId(
      user.id,
    );
    if (!workspaceId) {
      return NextResponse.redirect(
        new URL(`${returnPath}?connection=workspace_required`, request.url),
      );
    }
    const state = createConnectorOAuthState({
      userId: user.id,
      workspaceId,
      provider,
      returnPath,
    });
    const authorizationUrl =
      provider === "gmail"
        ? createGoogleAuthorizationUrl(state)
        : createMicrosoftAuthorizationUrl(state);
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(
      CONNECTOR_OAUTH_STATE_COOKIE,
      state.cookieValue,
      connectorOAuthCookieOptions(state.maxAgeSeconds),
    );
    return response;
  } catch {
    return NextResponse.redirect(
      new URL(`${returnPath}?connection=configuration_required`, request.url),
    );
  }
}
