import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ folders:[] });

  const { data, error } = await supabase
    .from("creative_folders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false });

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ folders:data || [] });
}

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { name, description } = await req.json();

  if (!name) return NextResponse.json({ error:"Missing folder name" }, { status:400 });

  const { data, error } = await supabase
    .from("creative_folders")
    .insert({ user_id:user.id, name, description:description || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ folder:data });
}
