import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ projects:[] });

  const { data, error } = await supabase
    .from("launch_studio_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending:false });

  if (error) return NextResponse.json({ error:error.message }, { status:500 });

  return NextResponse.json({ projects:data || [] });
}
