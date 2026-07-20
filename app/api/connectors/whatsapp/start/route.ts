import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import { buildEmbeddedSignupUrl } from "@/lib/connectors/providers/whatsapp";
import {
  createWhatsAppState,
  WHATSAPP_STATE_COOKIE,
  whatsappStateCookieOptions,
} from "@/lib/connectors/whatsappState";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const workspaceId = await ConnectorRepository.resolveDefaultWorkspaceId(
    user.id,
  );
  if (!workspaceId) {
    return NextResponse.redirect(
      new URL("/connections?error=workspace_required", req.url),
    );
  }
  const returnPath =
    new URL(req.url).searchParams.get("returnTo") === "/communications"
      ? "/communications"
      : "/connections";
  const state = createWhatsAppState({
    userId: user.id,
    workspaceId,
    returnPath,
  });
  const url = buildEmbeddedSignupUrl(state.state);
  if (!url) {
    return NextResponse.redirect(
      new URL("/connections?error=meta_configuration_required", req.url),
    );
  }
  const response = NextResponse.redirect(url);
  response.cookies.set(
    WHATSAPP_STATE_COOKIE,
    state.cookieValue,
    whatsappStateCookieOptions(state.maxAgeSeconds),
  );
  return response;
}
