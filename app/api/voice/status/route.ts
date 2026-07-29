import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "unsigned_twilio_voice_webhook_retired",
        message:
          "Direct unsigned Twilio voice handling is disabled. Assign the number through ElevenLabs.",
      },
    },
    { status: 410 },
  );
}
