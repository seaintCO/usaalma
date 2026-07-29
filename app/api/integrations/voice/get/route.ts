import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "legacy_voice_connection_retired",
        message: "Use /api/voice-agents/connection.",
      },
    },
    { status: 410 },
  );
}
