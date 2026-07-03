import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";
import { classifyAction } from "@/lib/ai/actions/classifyAction";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const { message } = await req.json();
  const supabase = await createClient();

  const routed = await classifyAction(message);

  let result = "No action needed.";

  if (routed.action === "save_memory") {
    await supabase.from("alma_user_memory").upsert({
      user_id:user.id,
      memory_key:routed.payload.memory_key || "note",
      memory_value:routed.payload.memory_value || message,
      category:routed.payload.category || "general",
      updated_at:new Date().toISOString(),
    }, { onConflict:"user_id,memory_key" });

    result = "Saved to ALMA memory.";
  }

  if (routed.action === "create_planner_task") {
    await supabase.from("planner_tasks").insert({
      user_id:user.id,
      title:routed.payload.title || message,
      notes:routed.payload.notes || "",
      task_date:routed.payload.task_date || new Date().toISOString().slice(0,10),
      task_time:routed.payload.task_time || "",
      category:routed.payload.category || "General",
      priority:routed.payload.priority || "Medium",
    });

    result = "Added to planner.";
  }

  if (routed.action === "log_food") {
    await supabase.from("fitness_food_logs").insert({
      user_id:user.id,
      food_name:routed.payload.food_name || message,
      calories:Number(routed.payload.calories || 0),
      protein:Number(routed.payload.protein || 0),
      carbs:Number(routed.payload.carbs || 0),
      fats:Number(routed.payload.fats || 0),
      meal_type:routed.payload.meal_type || "Meal",
    });

    result = "Food logged.";
  }

  if (routed.action === "save_fitness_goal") {
    await supabase.from("fitness_goals").upsert({
      user_id:user.id,
      daily_calories:Number(routed.payload.daily_calories || 2200),
      daily_protein:Number(routed.payload.daily_protein || 180),
      weekly_weight_goal:routed.payload.weekly_weight_goal || "Maintain",
      water_goal_oz:Number(routed.payload.water_goal_oz || 100),
      workout_days:Number(routed.payload.workout_days || 5),
      updated_at:new Date().toISOString(),
    }, { onConflict:"user_id" });

    result = "Fitness goals updated.";
  }

  await supabase.from("alma_action_logs").insert({
    user_id:user.id,
    action_type:routed.action,
    input:message,
    result,
    status:"completed",
  });

  return NextResponse.json({
    success:true,
    action:routed.action,
    result,
  });
}
