import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import { EntitlementService } from "@/lib/platform/entitlements/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { getElevenLabsSignedUrl } from "@/lib/voice-agents/elevenlabs";

type Context = { params: Promise<{ agentId: string }> };

export async function POST(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const access = await EntitlementService.checkModuleAccess(user.id, "voice");
  if (access?.accessStatus !== "included") {
    return NextResponse.json(
      { ok: false, error: { code: "voice_plan_required" } },
      { status: 403 },
    );
  }
  const { agentId } = await context.params;
  const workspaceId = await ConnectorRepository.resolveDefaultWorkspaceId(
    user.id,
  );
  if (!workspaceId) {
    return NextResponse.json(
      { ok: false, error: { code: "workspace_required" } },
      { status: 409 },
    );
  }
  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("voice_agent_profiles")
    .select("id,external_agent_id,connection_id,status")
    .eq("id", agentId)
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error || !profile) {
    return NextResponse.json(
      { ok: false, error: { code: "voice_agent_not_found" } },
      { status: 404 },
    );
  }
  if (profile.status !== "active") {
    return NextResponse.json(
      { ok: false, error: { code: "voice_agent_not_active" } },
      { status: 409 },
    );
  }
  try {
    const secret = await ConnectorRepository.readAccessToken(
      profile.connection_id,
    );
    const signedUrl = await getElevenLabsSignedUrl({
      apiKey: secret.accessToken,
      agentId: profile.external_agent_id,
    });
    return NextResponse.json({
      ok: true,
      signedUrl,
      expiresInSeconds: 900,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "voice_session_unavailable" } },
      { status: 502 },
    );
  }
}
