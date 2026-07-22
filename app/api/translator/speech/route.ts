import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  getOpenAIApiKey,
  getSpeechModel,
  normalizeVoice,
  VoiceConfigurationError,
} from "@/lib/voice/config";
import { withUsageReservation } from "@/lib/usage/service";
import { UsageLimitError } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

const MAX_SPEECH_CHARACTERS = 4000;

function jsonError(code: string, status: number) {
  return NextResponse.json({ ok: false, error: { code } }, { status });
}

function providerStatus(error: unknown) {
  if (typeof error === "object" && error && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
  }
  return undefined;
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
    model = getSpeechModel();
  } catch (error) {
    if (error instanceof UsageLimitError) throw error;
    if (error instanceof VoiceConfigurationError) {
      return jsonError(error.code, 503);
    }
    return jsonError("audio_configuration_failed", 503);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return jsonError("text_required", 400);
  }
  if (text.length > MAX_SPEECH_CHARACTERS) {
    return jsonError("text_too_long", 413);
  }

  const client = new OpenAI({ apiKey });
  try {
    const seconds = Math.max(1, Math.ceil(text.length / 15));
    const response = await withUsageReservation(
      {
        userId: user.id,
        feature: "voice",
        mode: null,
        model,
        units: { voiceSeconds: seconds },
        idempotencyKey: `speech:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
      },
      () =>
        client.audio.speech.create({
          model,
          voice: normalizeVoice(body.voice),
          input: text,
        }),
      { voiceSeconds: seconds },
    );
    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = providerStatus(error);
    if (status === 429) return jsonError("rate_limited", 429);
    if (status === 401) return jsonError("openai_auth_failed", 503);
    if (status === 400) return jsonError("speech_rejected", 400);
    return jsonError("speech_provider_failed", 502);
  }
}
export const POST = withUsageRoute(post);
