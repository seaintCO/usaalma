import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  return NextResponse.json({
    incomingWebhookUrl: `${base}/api/voice/incoming`,
    statusWebhookUrl: `${base}/api/voice/status`,
  });
}
