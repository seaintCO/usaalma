import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "legacy_voice_audio_retired",
        message: "Use the signed ElevenLabs voice-agent session.",
      },
    },
    { status: 410 },
  );
}
