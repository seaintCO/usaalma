import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import {
  exchangeWhatsAppCode,
  fetchWhatsAppPhoneMetadata,
} from "@/lib/connectors/providers/whatsapp";
import {
  verifyWhatsAppState,
  WHATSAPP_STATE_COOKIE,
  whatsappStateCookieOptions,
} from "@/lib/connectors/whatsappState";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const url = new URL(req.url);
  const state = verifyWhatsAppState({
    cookieValue: req.headers
      .get("cookie")
      ?.split(";")
      .find((entry) => entry.trim().startsWith(`${WHATSAPP_STATE_COOKIE}=`))
      ?.split("=")[1],
    state: url.searchParams.get("state"),
    userId: user.id,
  });
  if (!state) {
    return NextResponse.redirect(
      new URL("/connections?error=invalid_whatsapp_state", req.url),
    );
  }
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL(`${state.returnPath}?error=missing_whatsapp_code`, req.url),
    );
  }
  try {
    const token = await exchangeWhatsAppCode(code);
    const metadata = await fetchWhatsAppPhoneMetadata(token.access_token);
    await ConnectorRepository.saveWhatsAppConnection({
      userId: user.id,
      workspaceId: state.workspaceId,
      accessToken: token.access_token,
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null,
      ...metadata,
      metadata,
    });
    const response = NextResponse.redirect(new URL(state.returnPath, req.url));
    response.cookies.set(
      WHATSAPP_STATE_COOKIE,
      "",
      whatsappStateCookieOptions(0),
    );
    return response;
  } catch {
    return NextResponse.redirect(
      new URL(`${state.returnPath}?error=whatsapp_connection_failed`, req.url),
    );
  }
}
