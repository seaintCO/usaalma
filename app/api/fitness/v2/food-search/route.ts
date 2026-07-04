import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";

function nutrient(food:any, name:string) {
  const item = food.foodNutrients?.find((n:any) => String(n.nutrientName || "").toLowerCase().includes(name));
  return Math.round(Number(item?.value || 0));
}

export async function GET(req:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) return NextResponse.json([]);

  if (!process.env.USDA_FDC_API_KEY) {
    return NextResponse.json([
      { food_name:q, calories:100, protein:5, carbs:15, fat:2, source:"fallback" }
    ]);
  }

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_FDC_API_KEY}&query=${encodeURIComponent(q)}&pageSize=8`;

  const res = await fetch(url, { cache:"no-store" });
  const json = await res.json();

  const foods = (json.foods || []).map((food:any) => ({
    fdcId:food.fdcId,
    food_name:food.description,
    brand:food.brandName || "",
    calories:nutrient(food, "energy"),
    protein:nutrient(food, "protein"),
    carbs:nutrient(food, "carbohydrate"),
    fat:nutrient(food, "total lipid"),
    source:"USDA FDC"
  }));

  return NextResponse.json(foods);
}
