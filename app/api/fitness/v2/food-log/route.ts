import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fitness_food_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", new Date().toISOString().slice(0,10))
    .order("created_at", { ascending:false });

  if (error) return NextResponse.json({ error:error.message }, { status:400 });
  return NextResponse.json(data || []);
}

export async function POST(req:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase.from("fitness_food_entries").insert({
    user_id:user.id,
    food_name:body.food_name,
    calories:Number(body.calories || 0),
    protein:Number(body.protein || 0),
    carbs:Number(body.carbs || 0),
    fat:Number(body.fat || 0),
    serving_qty:Number(body.serving_qty || 1),
    meal_type:body.meal_type || "meal",
  }).select().single();

  if (error) return NextResponse.json({ error:error.message }, { status:400 });
  return NextResponse.json(data);
}

export async function PATCH(req:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase.from("fitness_food_entries")
    .update({
      food_name:body.food_name,
      calories:Number(body.calories || 0),
      protein:Number(body.protein || 0),
      carbs:Number(body.carbs || 0),
      fat:Number(body.fat || 0),
      serving_qty:Number(body.serving_qty || 1),
      meal_type:body.meal_type || "meal",
    })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:400 });
  return NextResponse.json(data);
}

export async function DELETE(req:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();
  const supabase = await createClient();

  const { error } = await supabase.from("fitness_food_entries")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error:error.message }, { status:400 });
  return NextResponse.json({ success:true });
}
