import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "legacy_voice_turn_retired",
        message: "Use /voice-agents and a server-created signed session.",
      },
    },
    { status: 410 },
  );
}
