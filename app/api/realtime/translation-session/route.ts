import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { EntitlementService } from "@/lib/platform/entitlements/service";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";
import {
  getOpenAIApiKey,
  getRealtimeTranslationModel,
  normalizeVoice,
  VoiceConfigurationError,
} from "@/lib/voice/config";
import { createVoiceSessionRecord } from "@/lib/voice/repository";
import {
  TRANSLATION_DIRECTIONS,
  type TranslationDirectionKey,
  type TranslationLanguage,
} from "@/lib/voice/realtimeTranslation";

const sessionAttempts = new Map<string, number[]>();
const SUPPORTED_LANGUAGES = new Set<TranslationLanguage>(["en", "es"]);

function jsonError(code: string, status: number) {
  return NextResponse.json({ ok: false, error: { code } }, { status });
}

function rateLimited(userId: string) {
  const now = Date.now();
  const recent = (sessionAttempts.get(userId) ?? []).filter(
    (time) => now - time < 60_000,
  );
  recent.push(now);
  sessionAttempts.set(userId, recent);
  return recent.length > 6;
}

function hashSafetyIdentifier(userId: string, workspaceId: string | null) {
  return createHash("sha256")
    .update(`alma:${workspaceId ?? "personal"}:${userId}`)
    .digest("hex");
}

function isTranslationLanguage(value: unknown): value is TranslationLanguage {
  return value === "en" || value === "es";
}

function directionKey(
  sourceLanguage: TranslationLanguage,
  targetLanguage: TranslationLanguage,
): TranslationDirectionKey | null {
  if (sourceLanguage === "en" && targetLanguage === "es") return "en_to_es";
  if (sourceLanguage === "es" && targetLanguage === "en") return "es_to_en";
  return null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  if (rateLimited(user.id)) return jsonError("rate_limited", 429);

  const entitlement = await EntitlementService.checkModuleAccess(
    user.id,
    "voice",
  );
  if (entitlement && entitlement.accessStatus !== "included") {
    return jsonError("voice_entitlement_required", 403);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sourceLanguage = isTranslationLanguage(body.sourceLanguage)
    ? body.sourceLanguage
    : null;
  const targetLanguage = isTranslationLanguage(body.targetLanguage)
    ? body.targetLanguage
    : null;
  if (
    !sourceLanguage ||
    !targetLanguage ||
    !SUPPORTED_LANGUAGES.has(sourceLanguage) ||
    !SUPPORTED_LANGUAGES.has(targetLanguage) ||
    sourceLanguage === targetLanguage
  ) {
    return jsonError("unsupported_translation_direction", 400);
  }

  const key = directionKey(sourceLanguage, targetLanguage);
  if (!key) return jsonError("unsupported_translation_direction", 400);

  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : null;
  const tenant = await resolveTenantWorkspace({ userId: user.id, workspaceId });

  let apiKey: string;
  let model: string;
  try {
    apiKey = getOpenAIApiKey();
    model = getRealtimeTranslationModel();
  } catch (error) {
    if (error instanceof VoiceConfigurationError) {
      return jsonError(error.code, 503);
    }
    return jsonError("audio_configuration_failed", 503);
  }

  const direction = TRANSLATION_DIRECTIONS[key];
  const response = await fetch(
    "https://api.openai.com/v1/realtime/translations/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime.translation",
          model,
          source_language: direction.sourceLanguage,
          target_language: direction.targetLanguage,
          input_audio_transcription: {
            model: process.env.ALMA_TRANSCRIPTION_MODEL || "gpt-4o-transcribe",
          },
          audio: {
            input: {
              turn_detection: { type: "server_vad" },
              noise_reduction: { type: "near_field" },
            },
            output: { voice: normalizeVoice(body.voice) },
          },
          safety_identifier: hashSafetyIdentifier(user.id, tenant.workspaceId),
          instructions:
            "Translate speech faithfully between English and Spanish. Do not add facts, prices, measurements, warranties, or commitments. Use neutral Latin American Spanish and clear US English.",
        },
      }),
    },
  );

  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    return jsonError(
      response.status === 429
        ? "rate_limited"
        : "realtime_translation_secret_failed",
      status,
    );
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const clientSecret =
    typeof payload.client_secret === "object" &&
    payload.client_secret !== null &&
    "value" in payload.client_secret &&
    typeof payload.client_secret.value === "string"
      ? payload.client_secret.value
      : typeof payload.value === "string"
        ? payload.value
        : null;
  if (!clientSecret) {
    return jsonError("realtime_translation_secret_invalid", 502);
  }

  const localSessionId = await createVoiceSessionRecord({
    userId: user.id,
    workspaceId: tenant.workspaceId,
    mode: "translator",
    model,
    language: direction.targetLanguage,
  });

  return NextResponse.json({
    ok: true,
    clientSecret,
    localSessionId,
    model,
    direction,
    maxSessionSeconds: 15 * 60,
    transcriptPersistence: "workspace_memory_preference",
    disclosure:
      "AI voice is synthetic. Raw audio is not stored by ALMA by default.",
  });
}
