import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/user";
import { encryptSecret } from "@/lib/security/crypto";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.apiKey) {
    return NextResponse.json(
      { error: "Missing ElevenLabs API key" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  await supabase.from("oauth_connections").upsert({
    user_id: user.id,
    provider: "elevenlabs",
    encrypted_secret: encryptSecret(body.apiKey),
    connected: true,
    metadata: { status: "api_key_saved" },
  });

  return NextResponse.json({ success: true });
}
