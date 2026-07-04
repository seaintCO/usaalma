import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();
  const supabase = await createClient();

  const message =
    body.message ||
    `Hi ${body.caller_name || ""}, this is the team following up from your call. We received your request and will get back to you shortly.`;

  const { data, error } = await supabase
    .from("receptionist_followups")
    .insert({
      user_id:user.id,
      lead_id:body.lead_id,
      channel:body.channel || "sms",
      recipient:body.recipient,
      message,
      status:"draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:400 });

  return NextResponse.json({ success:true, followup:data });
}
