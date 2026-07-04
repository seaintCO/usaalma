import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ journal:[] });

  const { data } = await supabase
    .from("trader_journal")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false })
    .limit(50);

  return NextResponse.json({ journal:data || [] });
}

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  const { data, error } = await supabase
    .from("trader_journal")
    .insert({
      user_id:user.id,
      symbol:body.symbol,
      direction:body.direction,
      setup:body.setup,
      entry:body.entry,
      stop:body.stop,
      target:body.target,
      notes:body.notes,
      result:body.result,
      confidence:body.confidence || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ journal:data });
}
