import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import { EntitlementService } from "@/lib/platform/entitlements/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createElevenLabsAgent } from "@/lib/voice-agents/elevenlabs";

async function contextFor(userId: string) {
  const access = await EntitlementService.checkModuleAccess(userId, "voice");
  if (access?.accessStatus !== "included") return null;
  const workspaceId =
    await ConnectorRepository.resolveDefaultWorkspaceId(userId);
  if (!workspaceId) return null;
  return { workspaceId };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const workspaceId = await ConnectorRepository.resolveDefaultWorkspaceId(
    user.id,
  ).catch(() => null);
  if (!workspaceId) {
    return NextResponse.json({ ok: true, agents: [], calls: [] });
  }
  const supabase = createAdminClient();
  const [agents, calls] = await Promise.all([
    supabase
      .from("voice_agent_profiles")
      .select(
        "id,workspace_id,external_agent_id,name,agent_type,status,language,greeting,system_prompt,voice_id,disclosure_text,phone_number,human_transfer_phone,recording_enabled,auto_create_leads,last_synced_at,created_at",
      )
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("voice_call_records")
      .select(
        "id,agent_profile_id,contact_id,provider_conversation_id,direction,caller_phone,called_phone,status,started_at,ended_at,duration_seconds,transcript_text,summary,outcome,sentiment,recording_available,created_at",
      )
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (agents.error || calls.error) {
    return NextResponse.json(
      { ok: false, error: { code: "voice_agents_unavailable" } },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true,
    agents: agents.data ?? [],
    calls: calls.data ?? [],
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const context = await contextFor(user.id);
  if (!context) {
    return NextResponse.json(
      { ok: false, error: { code: "voice_plan_or_workspace_required" } },
      { status: 403 },
    );
  }
  const connection = await ConnectorRepository.getConnectedProviderConnection({
    userId: user.id,
    workspaceId: context.workspaceId,
    provider: "elevenlabs",
  });
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: { code: "elevenlabs_connection_required" } },
      { status: 409 },
    );
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const name = String(body?.name ?? "").trim();
  const greeting = String(body?.greeting ?? "").trim();
  const systemPrompt = String(body?.systemPrompt ?? "").trim();
  const agentType = String(body?.agentType ?? "receptionist");
  const language = String(body?.language ?? "en");
  if (
    !name ||
    !greeting ||
    !systemPrompt ||
    name.length > 100 ||
    greeting.length > 800 ||
    systemPrompt.length > 8_000 ||
    !["receptionist", "assistant", "transcriber"].includes(agentType) ||
    !["en", "es", "bilingual"].includes(language)
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_voice_agent" } },
      { status: 400 },
    );
  }
  const secret = await ConnectorRepository.readAccessToken(connection.id);
  try {
    const externalAgentId = await createElevenLabsAgent({
      apiKey: secret.accessToken,
      name,
      greeting,
      systemPrompt,
      language: language as "en" | "es" | "bilingual",
      voiceId: String(body?.voiceId ?? "").trim() || null,
    });
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("voice_agent_profiles")
      .insert({
        user_id: user.id,
        workspace_id: context.workspaceId,
        connection_id: connection.id,
        external_agent_id: externalAgentId,
        name,
        agent_type: agentType,
        status: "active",
        language,
        greeting,
        system_prompt: systemPrompt,
        voice_id: String(body?.voiceId ?? "").trim() || null,
        disclosure_text:
          String(body?.disclosureText ?? "").trim() ||
          "This call may be handled and transcribed by an AI assistant.",
        human_transfer_phone:
          String(body?.humanTransferPhone ?? "").trim() || null,
        recording_enabled: Boolean(body?.recordingEnabled),
        auto_create_leads: body?.autoCreateLeads !== false,
        provider_metadata: { provisioning: "alma_byok" },
        last_synced_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    await ConnectorRepository.markLastAction(connection.id);
    return NextResponse.json({ ok: true, agent: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "voice_agent_provision_failed",
          message:
            "ElevenLabs could not create this agent. Verify account permissions and billing.",
        },
      },
      { status: 502 },
    );
  }
}
