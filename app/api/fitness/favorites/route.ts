import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const supabase = await createClient();
  const { data } = await supabase
    .from("fitness_favorite_foods")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false });

  return NextResponse.json({ favorites: data || [] });
}

export async function POST(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();
  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("fitness_favorite_foods")
    .insert({
      user_id: user.id,
      food_name: body.food_name,
      calories: Number(body.calories || 0),
      protein: Number(body.protein || 0),
      carbs: Number(body.carbs || 0),
      fats: Number(body.fats || 0),
      serving: body.serving || "",
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status:500 });
  return NextResponse.json({ success:true, favorite:data });
}
