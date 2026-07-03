import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const supabase = await createClient();

  const { data } = await supabase
    .from("workspace_voice_connections")
    .select("twilio_account_sid, twilio_phone_number, elevenlabs_voice_id, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(data || {});
}
