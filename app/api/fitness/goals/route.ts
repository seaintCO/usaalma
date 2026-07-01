import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const supabase = await createClient();

  const { data } = await supabase
    .from("fitness_goals")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    goal: data || {
      daily_calories: 2200,
      daily_protein: 180,
      weekly_weight_goal: "Maintain",
      water_goal_oz: 100,
      workout_days: 5,
    }
  });
}

export async function POST(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();
  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("fitness_goals")
    .upsert({
      user_id: user.id,
      daily_calories: Number(body.daily_calories || 2200),
      daily_protein: Number(body.daily_protein || 180),
      weekly_weight_goal: body.weekly_weight_goal || "Maintain",
      water_goal_oz: Number(body.water_goal_oz || 100),
      workout_days: Number(body.workout_days || 5),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true, goal: data });
}
