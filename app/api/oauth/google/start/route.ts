import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  createGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  googleOAuthCookieOptions,
} from "@/lib/google/oauthState";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  const requestedReturnPath = new URL(req.url).searchParams.get("returnTo");
  const returnPath =
    requestedReturnPath === "/marketplace" ? "/marketplace" : "/marketplace";
  const state = createGoogleOAuthState(user.id, returnPath);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    state: state.state,
    code_challenge: state.codeChallenge,
    code_challenge_method: "S256",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive.file",
    ].join(" "),
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    state.cookieValue,
    googleOAuthCookieOptions(state.maxAgeSeconds),
  );
  return response;
}
