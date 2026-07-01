import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();
  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("planner_tasks")
    .insert({
      user_id:user.id,
      title:body.title,
      notes:body.notes,
      task_date:body.task_date || new Date().toISOString().slice(0,10),
      task_time:body.task_time || "",
      category:body.category || "Fitness",
      priority:body.priority || "Medium",
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error:dbError.message }, { status:500 });
  return NextResponse.json({ success:true, task:data });
}
