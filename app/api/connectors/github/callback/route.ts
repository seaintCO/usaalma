import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import {
  GITHUB_APP_STATE_COOKIE,
  githubAppStateCookieOptions,
  verifyGitHubAppState,
} from "@/lib/connectors/githubAppState";

function cookieValue(cookieHeader: string | null, name: string) {
  return cookieHeader
    ?.split(";")
    .find((entry) => entry.trim().startsWith(`${name}=`))
    ?.split("=")[1];
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const state = verifyGitHubAppState({
    cookieValue: cookieValue(
      req.headers.get("cookie"),
      GITHUB_APP_STATE_COOKIE,
    ),
    state: url.searchParams.get("state"),
    userId: user.id,
  });
  if (!state) {
    return NextResponse.redirect(
      new URL("/connections?error=invalid_github_state", req.url),
    );
  }

  const installationId = url.searchParams.get("installation_id");
  if (!installationId) {
    return NextResponse.redirect(
      new URL(`${state.returnPath}?error=missing_github_installation`, req.url),
    );
  }

  try {
    await ConnectorRepository.saveGitHubAppConnection({
      userId: user.id,
      workspaceId: state.workspaceId,
      installationId,
      accountLogin: url.searchParams.get("account"),
      accountId: null,
      setupAction: url.searchParams.get("setup_action"),
      metadata: { appSlug: process.env.GITHUB_APP_SLUG ?? null },
    });
    const response = NextResponse.redirect(new URL(state.returnPath, req.url));
    response.cookies.set(
      GITHUB_APP_STATE_COOKIE,
      "",
      githubAppStateCookieOptions(0),
    );
    return response;
  } catch {
    return NextResponse.redirect(
      new URL(`${state.returnPath}?error=github_connection_failed`, req.url),
    );
  }
}
