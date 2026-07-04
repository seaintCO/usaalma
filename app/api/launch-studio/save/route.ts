import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { id, demo, prompt, template } = await req.json();

  if (!demo) return NextResponse.json({ error:"Missing demo" }, { status:400 });

  if (id) {
    const { data, error } = await supabase
      .from("launch_studio_projects")
      .update({
        title: demo.title || "Untitled Demo",
        slug: demo.slug || null,
        prompt: prompt || null,
        template: template || "saas",
        demo,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error:error.message }, { status:500 });
    return NextResponse.json({ project:data });
  }

  const { data, error } = await supabase
    .from("launch_studio_projects")
    .insert({
      user_id:user.id,
      title: demo.title || "Untitled Demo",
      slug: demo.slug || null,
      prompt: prompt || null,
      template: template || "saas",
      demo
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:500 });

  return NextResponse.json({ project:data });
}
