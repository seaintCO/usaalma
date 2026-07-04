import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_voice_connections")
    .upsert({
      user_id:user.id,
      twilio_account_sid:body.twilio_account_sid || "",
      twilio_auth_token:body.twilio_auth_token || "",
      twilio_phone_number:body.twilio_phone_number || "",
      elevenlabs_api_key:body.elevenlabs_api_key || "",
      elevenlabs_voice_id:body.elevenlabs_voice_id || "",
      updated_at:new Date().toISOString(),
    }, { onConflict:"user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:400 });

  return NextResponse.json({ success:true, connection:data });
}
