import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";

export async function POST(req:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();
  const goals = body.goals || {};
  const goal = goals.weight_goal || "Maintain";

  const plan = `Fitness Plan

Goal: ${goal}

Daily Targets:
- Calories: ${goals.calories || 2200}
- Protein: ${goals.protein || 180}g
- Carbs: ${goals.carbs || 180}g
- Fat: ${goals.fat || 70}g

Meal Planner:
1. Breakfast: eggs or Greek yogurt, fruit, oats
2. Lunch: lean protein, rice/potatoes, vegetables
3. Snack: protein shake or cottage cheese
4. Dinner: chicken/steak/fish, vegetables, controlled carbs

Grocery List:
- Eggs
- Greek yogurt
- Chicken breast
- Lean beef
- Rice or potatoes
- Vegetables
- Fruit
- Protein powder

AI Coach:
Stay consistent for 7 days before changing calories. If weight is not moving, adjust calories by 150-250.`;

  return NextResponse.json({ plan });
}
