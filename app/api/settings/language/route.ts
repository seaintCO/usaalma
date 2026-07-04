import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ language:"auto" });

  const { data } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ language:data?.preferred_language || "auto" });
}

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { language } = await req.json();

  if (!["auto","en","es"].includes(language)) {
    return NextResponse.json({ error:"Invalid language" }, { status:400 });
  }

  await supabase
    .from("profiles")
    .upsert({
      id:user.id,
      preferred_language:language,
      updated_at:new Date().toISOString()
    });

  return NextResponse.json({ success:true, language });
}
