import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { id } = await req.json();

  if (!id) return NextResponse.json({ error:"Missing id" }, { status:400 });

  const { error } = await supabase
    .from("launch_studio_projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error:error.message }, { status:500 });

  return NextResponse.json({ success:true });
}
