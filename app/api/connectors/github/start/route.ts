import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getMissingConnectorEnv } from "@/lib/connectors/config";
import { ConnectorRepository } from "@/lib/connectors/repository";
import {
  cleanGitHubReturnPath,
  createGitHubAppState,
  GITHUB_APP_STATE_COOKIE,
  githubAppStateCookieOptions,
} from "@/lib/connectors/githubAppState";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const missing = getMissingConnectorEnv("github_app");
  if (missing.length) {
    return NextResponse.redirect(
      new URL("/connections?error=github_configuration_required", req.url),
    );
  }

  const workspaceId = await ConnectorRepository.resolveDefaultWorkspaceId(
    user.id,
  );
  if (!workspaceId) {
    return NextResponse.redirect(
      new URL("/connections?error=workspace_required", req.url),
    );
  }

  const returnPath = cleanGitHubReturnPath(
    new URL(req.url).searchParams.get("returnTo"),
  );
  const state = createGitHubAppState({
    userId: user.id,
    workspaceId,
    returnPath,
  });
  const appSlug = process.env.GITHUB_APP_SLUG;
  const installUrl = new URL(
    `https://github.com/apps/${appSlug}/installations/new`,
  );
  installUrl.searchParams.set("state", state.state);

  const response = NextResponse.redirect(installUrl);
  response.cookies.set(
    GITHUB_APP_STATE_COOKIE,
    state.cookieValue,
    githubAppStateCookieOptions(state.maxAgeSeconds),
  );
  return response;
}
