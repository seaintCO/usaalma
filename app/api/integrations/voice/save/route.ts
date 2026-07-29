import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "legacy_voice_connection_retired",
        message:
          "Use /api/voice-agents/connection. Plaintext voice credentials are no longer accepted.",
      },
    },
    { status: 410 },
  );
}
