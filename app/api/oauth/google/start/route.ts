import { NextResponse } from "next/server";

/**
 * Compatibility redirect for older Settings and Marketplace links.
 *
 * Gmail now uses the canonical workspace-scoped connector with PKCE,
 * encrypted credentials, configuration validation, and safe in-app errors.
 * Keeping this redirect prevents old bookmarked URLs from constructing a
 * malformed Google authorization request.
 */
export async function GET(request: Request) {
  const requestedReturnPath = new URL(request.url).searchParams.get("returnTo");
  const returnPath =
    requestedReturnPath === "/onboarding"
      ? "/onboarding"
      : requestedReturnPath === "/office"
        ? "/office"
        : requestedReturnPath === "/marketplace"
          ? "/marketplace"
          : "/connections";
  const target = new URL("/api/connectors/oauth/gmail/start", request.url);
  target.searchParams.set("returnTo", returnPath);
  return NextResponse.redirect(target);
}
