import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.id) return NextResponse.json({ error:"Missing receptionist id" }, { status:400 });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("receptionists")
    .update({ status:"ready" })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:500 });

  return NextResponse.json(data);
}
