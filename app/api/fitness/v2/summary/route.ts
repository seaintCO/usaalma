import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

type Totals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type FoodSummaryRow = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving_qty: number | null;
  meal_type: string | null;
};

function emptyTotals(): Totals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function addTotals(totals: Totals, entry: FoodSummaryRow) {
  const quantity = Number(entry.serving_qty || 1);
  totals.calories += Number(entry.calories || 0) * quantity;
  totals.protein += Number(entry.protein || 0) * quantity;
  totals.carbs += Number(entry.carbs || 0) * quantity;
  totals.fat += Number(entry.fat || 0) * quantity;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date =
    new URL(req.url).searchParams.get("date") ||
    new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fitness_food_entries")
    .select("calories,protein,carbs,fat,serving_qty,meal_type")
    .eq("user_id", user.id)
    .eq("log_date", date);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  const totals = emptyTotals();
  const meals: Record<string, Totals> = {};

  for (const entry of data || []) {
    const meal = String(entry.meal_type || "meal").toLowerCase();
    meals[meal] ||= emptyTotals();
    addTotals(totals, entry);
    addTotals(meals[meal], entry);
  }

  return NextResponse.json({ date, totals, meals });
}
