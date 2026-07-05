import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ mode:"auto" });

  const { data } = await supabase
    .from("profiles")
    .select("alma_mode")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ mode:data?.alma_mode || "auto" });
}

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { mode } = await req.json();

  if (!["auto","fast","deep"].includes(mode)) {
    return NextResponse.json({ error:"Invalid mode" }, { status:400 });
  }

  await supabase.from("profiles").upsert({
    id:user.id,
    alma_mode:mode,
    updated_at:new Date().toISOString()
  });

  return NextResponse.json({ success:true, mode });
}
