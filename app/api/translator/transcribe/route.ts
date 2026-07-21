import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  CommunicationProviderError,
  CommunicationProviderUnavailableError,
  CommunicationValidationError,
  runCommunicationOperation,
} from "@/lib/communications/translationService";
import {
  normalizeCommunicationLanguage,
  type CommunicationLanguageCode,
} from "@/lib/communications/languages";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";
import {
  getTranscriptionAudioFileInfo,
  MAX_TRANSCRIPTION_AUDIO_BYTES,
  normalizeAudioMimeType,
  SUPPORTED_TRANSCRIPTION_CONTAINERS,
} from "@/lib/voice/audioUpload";
import {
  getOpenAIApiKey,
  getTranscriptionModel,
  VoiceConfigurationError,
} from "@/lib/voice/config";
import { recordVoiceTranscript } from "@/lib/voice/repository";
import { modeConfiguration } from "@/lib/usage/modes";
import {
  releaseUsage,
  reserveUsage,
  settleUsage,
  withUsageReservation,
} from "@/lib/usage/service";
import { UsageLimitError } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

function jsonError(
  code: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    { ok: false, error: { code, ...details } },
    { status },
  );
}

function providerStatus(error: unknown) {
  if (typeof error === "object" && error && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
  }
  return undefined;
}

function mapProviderError(error: unknown) {
  const status = providerStatus(error);
  if (status === 429) return jsonError("rate_limited", 429);
  if (status === 401) return jsonError("openai_auth_failed", 503);
  if (status === 400) return jsonError("transcription_rejected", 400);
  return jsonError("transcription_provider_failed", 502);
}

async function post(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("unauthorized", 401);
  }

  let apiKey: string;
  let model: string;
  try {
    apiKey = getOpenAIApiKey();
    model = getTranscriptionModel();
  } catch (error) {
    if (error instanceof UsageLimitError) throw error;
    if (error instanceof VoiceConfigurationError) {
      return jsonError(error.code, 503);
    }
    return jsonError("audio_configuration_failed", 503);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("invalid_form_data", 400);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return jsonError("empty_audio", 400);
  }
  if (audio.size > MAX_TRANSCRIPTION_AUDIO_BYTES) {
    return jsonError("audio_too_large", 413);
  }

  const fileInfo = getTranscriptionAudioFileInfo(audio.type);
  if (!fileInfo) {
    return jsonError("unsupported_audio_type", 415, {
      receivedMimeType: normalizeAudioMimeType(audio.type),
      supportedContainers: SUPPORTED_TRANSCRIPTION_CONTAINERS,
    });
  }

  const targetLanguage = normalizeCommunicationLanguage(
    form.get("targetLanguage"),
    "es",
  );
  const workspaceId =
    typeof form.get("workspaceId") === "string"
      ? (form.get("workspaceId") as string)
      : null;
  const tenant = await resolveTenantWorkspace({ userId: user.id, workspaceId });
  const client = new OpenAI({ apiKey });

  let transcript = "";
  try {
    const normalizedAudio = new File(
      [await audio.arrayBuffer()],
      fileInfo.fileName,
      { type: fileInfo.mimeType },
    );
    const estimatedSeconds = Math.max(1, Math.ceil(audio.size / 2_000));
    const voiceUsage = await reserveUsage({
      userId: user.id,
      feature: "voice",
      mode: null,
      model,
      units: { voiceSeconds: estimatedSeconds },
      idempotencyKey: `transcription:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    });
    let transcription;
    try {
      transcription = await client.audio.transcriptions.create({
        file: normalizedAudio,
        model,
        response_format: "verbose_json",
      });
      await settleUsage(voiceUsage, {
        voiceSeconds: Math.max(1, Math.ceil(transcription.duration)),
      });
    } catch (error) {
      await releaseUsage(voiceUsage);
      throw error;
    }
    transcript = transcription.text?.trim() ?? "";
  } catch (error) {
    if (error instanceof UsageLimitError) throw error;
    return mapProviderError(error);
  }

  if (!transcript) {
    return jsonError("empty_transcript", 422);
  }

  let translated;
  try {
    const configured = modeConfiguration("instant");
    translated = await withUsageReservation(
      {
        userId: user.id,
        feature: "ai_request",
        mode: "instant",
        model: configured.model,
        units: { requests: 1 },
        idempotencyKey: `transcription-translate:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
      },
      () =>
        runCommunicationOperation({
          operation: "translate_text",
          text: transcript,
          sourceLanguage: "auto",
          targetLanguage: targetLanguage as CommunicationLanguageCode,
          channel: "translator",
        }),
    );
  } catch (error) {
    if (error instanceof CommunicationProviderUnavailableError) {
      return jsonError(error.code, 503);
    }
    if (error instanceof CommunicationProviderError) {
      return jsonError(
        error.status === 429 ? "rate_limited" : error.code,
        error.status === 429 ? 429 : 502,
      );
    }
    if (error instanceof CommunicationValidationError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code, reasons: error.reasons } },
        { status: 502 },
      );
    }
    return jsonError("translation_failed", 502);
  }

  await recordVoiceTranscript({
    userId: user.id,
    workspaceId: tenant.workspaceId,
    source: "translator",
    transcript,
    translation: translated.translation,
    sourceLanguage: translated.detectedLanguage,
    targetLanguage: translated.targetLanguage,
  });
  return NextResponse.json({
    ok: true,
    transcript,
    translated,
    provider: { transcriptionModel: model },
  });
}
export const POST = withUsageRoute(post);
