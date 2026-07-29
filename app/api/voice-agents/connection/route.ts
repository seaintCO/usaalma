import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import { EntitlementService } from "@/lib/platform/entitlements/service";
import { validateElevenLabsApiKey } from "@/lib/voice-agents/elevenlabs";

async function authorize(userId: string) {
  const access = await EntitlementService.checkModuleAccess(userId, "voice");
  return access?.accessStatus === "included";
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
    return NextResponse.json({
      ok: true,
      connection: { status: "workspace_required", connected: false },
    });
  }
  const connection = await ConnectorRepository.getConnectedProviderConnection({
    userId: user.id,
    workspaceId,
    provider: "elevenlabs",
  }).catch(() => null);
  return NextResponse.json({
    ok: true,
    connection: {
      connected: Boolean(connection),
      status: connection?.connection_status ?? "not_connected",
      accountName: connection?.provider_account_name ?? null,
      lastSuccessfulUse: connection?.last_successful_action_at ?? null,
      webhookConfigured: Boolean(connection?.has_refresh_token),
    },
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
  if (!(await authorize(user.id))) {
    return NextResponse.json(
      { ok: false, error: { code: "voice_plan_upgrade_required" } },
      { status: 403 },
    );
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const apiKey = String(body?.apiKey ?? "").trim();
  const webhookSecret = String(body?.webhookSecret ?? "").trim();
  if (!apiKey || apiKey.length < 20) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_elevenlabs_api_key" } },
      { status: 400 },
    );
  }
  const workspaceId = await ConnectorRepository.resolveDefaultWorkspaceId(
    user.id,
  );
  if (!workspaceId) {
    return NextResponse.json(
      { ok: false, error: { code: "workspace_required" } },
      { status: 409 },
    );
  }
  try {
    const account = await validateElevenLabsApiKey(apiKey);
    await ConnectorRepository.saveApiKeyConnection({
      userId: user.id,
      workspaceId,
      provider: "elevenlabs",
      apiKey,
      secondarySecret: webhookSecret || null,
      providerAccountId: account.accountId,
      providerAccountName: "Customer-managed ElevenLabs",
      metadata: {
        billingOwner: "customer",
        webhookConfigured: Boolean(webhookSecret),
      },
    });
    return NextResponse.json({
      ok: true,
      connection: {
        connected: true,
        webhookConfigured: Boolean(webhookSecret),
      },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "elevenlabs_connection_failed",
          message:
            "ElevenLabs rejected the key or the connection could not be saved.",
        },
      },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  await ConnectorRepository.disconnectProvider({
    userId: user.id,
    provider: "elevenlabs",
  });
  return NextResponse.json({ ok: true });
}
