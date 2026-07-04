import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const supabase = await createClient();

  const { data:connections } = await supabase
    .from("workspace_voice_connections")
    .select("twilio_phone_number")
    .eq("user_id", user.id);

  const numbers = (connections || []).map((c:any)=>c.twilio_phone_number).filter(Boolean);

  if (numbers.length === 0) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("receptionist_call_turns")
    .select("*")
    .in("phone_to", numbers)
    .order("created_at", { ascending:false })
    .limit(100);

  if (error) return NextResponse.json({ error:error.message }, { status:400 });

  return NextResponse.json(data || []);
}
