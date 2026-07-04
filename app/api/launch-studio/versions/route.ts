import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { projectId, demo, title } = await req.json();
  if (!projectId || !demo) return NextResponse.json({ error:"Missing projectId or demo" }, { status:400 });

  const { data, error } = await supabase
    .from("launch_studio_versions")
    .insert({ project_id:projectId, user_id:user.id, title:title || demo.title || "Version", demo })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ version:data });
}

export async function GET(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ versions:[] });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");

  const { data, error } = await supabase
    .from("launch_studio_versions")
    .select("*")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .order("created_at", { ascending:false });

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ versions:data || [] });
}
