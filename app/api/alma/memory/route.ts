import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("alma_user_memory")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false });

  if (dbError) return NextResponse.json({ error:dbError.message }, { status:500 });

  return NextResponse.json({ memory:data || [] });
}

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();
  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("alma_user_memory")
    .upsert({
      user_id:user.id,
      memory_key:body.memory_key,
      memory_value:body.memory_value,
      category:body.category || "general",
      updated_at:new Date().toISOString(),
    }, { onConflict:"user_id,memory_key" })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error:dbError.message }, { status:500 });

  return NextResponse.json({ success:true, memory:data });
}
