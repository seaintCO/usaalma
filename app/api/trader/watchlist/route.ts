import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ watchlist:[] });

  const { data } = await supabase
    .from("trader_watchlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false });

  return NextResponse.json({ watchlist:data || [] });
}

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { symbol, notes } = await req.json();

  const { data, error } = await supabase
    .from("trader_watchlist")
    .insert({
      user_id:user.id,
      symbol:String(symbol || "").toUpperCase(),
      notes:notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ item:data });
}
