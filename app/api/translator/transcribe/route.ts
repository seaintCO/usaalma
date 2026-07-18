import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { runCommunicationOperation } from "@/lib/communications/translationService";
import {
  normalizeCommunicationLanguage,
  type CommunicationLanguageCode,
} from "@/lib/communications/languages";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";
import { getTranscriptionModel } from "@/lib/voice/config";
import { recordVoiceTranscript } from "@/lib/voice/repository";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: { code: "openai_unconfigured" } },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json(
      { ok: false, error: { code: "empty_audio" } },
      { status: 400 },
    );
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
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const transcription = await client.audio.transcriptions.create({
    file: audio,
    model: getTranscriptionModel(),
  });
  const transcript = transcription.text?.trim() ?? "";
  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: { code: "empty_transcript" } },
      { status: 422 },
    );
  }
  const translated = await runCommunicationOperation({
    operation: "translate_text",
    text: transcript,
    sourceLanguage: "auto",
    targetLanguage: targetLanguage as CommunicationLanguageCode,
    channel: "translator",
  });
  await recordVoiceTranscript({
    userId: user.id,
    workspaceId: tenant.workspaceId,
    source: "translator",
    transcript,
    translation: translated.translation,
    sourceLanguage: translated.detectedLanguage,
    targetLanguage: translated.targetLanguage,
  });
  return NextResponse.json({ ok: true, transcript, translated });
}
