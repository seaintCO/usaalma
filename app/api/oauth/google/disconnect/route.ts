import { getCurrentUser } from "@/lib/auth/user";
import { OAuthRepository } from "@/lib/db/repositories/oauth/oauth.repository";
import { decryptSecret } from "@/lib/security/crypto";
import { NextResponse } from "next/server";

function decryptStoredToken(value: string) {
  try {
    return decryptSecret(value);
  } catch {
    return value;
  }
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      {
        ok: false,
        error: { code: "unauthorized", message: "Authentication is required." },
      },
      { status: 401 },
    );
  try {
    const connection = await OAuthRepository.getGoogleWorkspaceConnection(
      user.id,
    );
    if (!connection)
      return NextResponse.json({ ok: true, disconnected: false });
    const encryptedToken = connection.refresh_token ?? connection.access_token;
    if (encryptedToken) {
      try {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: decryptStoredToken(encryptedToken),
          }),
        });
      } catch {
        // Revocation is best effort; local credentials are still invalidated below.
      }
    }
    await OAuthRepository.disconnectGoogleWorkspace(user.id);
    return NextResponse.json({ ok: true, disconnected: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "disconnect_failed",
          message: "Google Workspace could not be disconnected.",
        },
      },
      { status: 503 },
    );
  }
}
