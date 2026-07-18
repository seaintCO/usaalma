import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getSpeechModel, normalizeVoice } from "@/lib/voice/config";

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
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { ok: false, error: { code: "text_required" } },
      { status: 400 },
    );
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.audio.speech.create({
    model: getSpeechModel(),
    voice: normalizeVoice(body.voice),
    input: text.slice(0, 4000),
  });
  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
