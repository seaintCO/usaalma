import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("receptionist_leads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false });

  if (error) return NextResponse.json({ error:error.message }, { status:400 });

  return NextResponse.json(data || []);
}

export async function PATCH(req:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("receptionist_leads")
    .update({
      caller_name:body.caller_name,
      reason:body.reason,
      urgency:body.urgency,
      preferred_callback_time:body.preferred_callback_time,
      status:body.status,
      updated_at:new Date().toISOString(),
    })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:400 });

  return NextResponse.json(data);
}
