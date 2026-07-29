import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "legacy_elevenlabs_connection_retired",
        message:
          "Use /api/voice-agents/connection for encrypted customer-managed credentials.",
      },
    },
    { status: 410 },
  );
}
