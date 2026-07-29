import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "legacy_receptionist_retired",
        message: "Create and manage receptionists at /voice-agents.",
      },
    },
    { status: 410 },
  );
}
