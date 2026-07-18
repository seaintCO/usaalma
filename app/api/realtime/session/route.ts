import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { EntitlementService } from "@/lib/platform/entitlements/service";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";
import {
  getRealtimeModel,
  getRealtimeTranslationModel,
  normalizeVoice,
  voiceInstructions,
} from "@/lib/voice/config";
import { createVoiceSessionRecord } from "@/lib/voice/repository";

const sessionAttempts = new Map<string, number[]>();

function rateLimited(userId: string) {
  const now = Date.now();
  const recent = (sessionAttempts.get(userId) ?? []).filter(
    (time) => now - time < 60_000,
  );
  recent.push(now);
  sessionAttempts.set(userId, recent);
  return recent.length > 8;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  if (rateLimited(user.id)) {
    return NextResponse.json(
      { ok: false, error: { code: "rate_limited" } },
      { status: 429 },
    );
  }
  const entitlement = await EntitlementService.checkModuleAccess(
    user.id,
    "voice",
  );
  if (entitlement && entitlement.accessStatus !== "included") {
    return NextResponse.json(
      { ok: false, error: { code: "voice_entitlement_required" } },
      { status: 403 },
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: { code: "openai_unconfigured" } },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : null;
  const mode = body.mode === "translator" ? "translator" : "alma_voice";
  const tenant = await resolveTenantWorkspace({ userId: user.id, workspaceId });
  const model =
    mode === "translator"
      ? getRealtimeTranslationModel()
      : getRealtimeModel(false);
  const voice = normalizeVoice(body.voice);
  const language =
    body.language === "es" || body.language === "en" ? body.language : "auto";

  const response = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          audio: {
            output: { voice },
          },
          instructions: voiceInstructions(),
        },
      }),
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "realtime_session_failed" } },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const localSessionId = await createVoiceSessionRecord({
    userId: user.id,
    workspaceId: tenant.workspaceId,
    mode,
    model,
    language,
  });
  return NextResponse.json({
    ok: true,
    session: payload,
    localSessionId,
    disclosure:
      "AI voice is synthetic. External actions still require approval.",
  });
}
