import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function slugify(input:string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) + "-" + Math.random().toString(36).slice(2, 7);
}

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { projectId, demo } = await req.json();
  if (!demo) return NextResponse.json({ error:"Missing demo" }, { status:400 });

  const slug = slugify(demo.slug || demo.title || "alma-demo");

  const { data, error } = await supabase
    .from("launch_studio_public_links")
    .insert({ project_id:projectId || null, user_id:user.id, slug, demo, is_active:true })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:500 });

  return NextResponse.json({ share:data, url:`/launch/${slug}` });
}
