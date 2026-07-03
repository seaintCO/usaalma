import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("fitness_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false });

  if (dbError) return NextResponse.json({ error:dbError.message }, { status:500 });
  return NextResponse.json({ plans:data || [] });
}

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();
  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("fitness_plans")
    .insert({
      user_id:user.id,
      title:body.title || "Fitness Plan",
      goal:body.goal,
      calories:body.calories,
      protein:body.protein,
      carbs:body.carbs,
      fats:body.fats,
      plan_text:body.plan_text,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error:dbError.message }, { status:500 });
  return NextResponse.json({ success:true, plan:data });
}
