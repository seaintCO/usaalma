import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";

function nutrient(food:any, ids:number[]) {
  const found = food.foodNutrients?.find((n:any) => ids.includes(Number(n.nutrientId)));
  return Math.round(Number(found?.value || 0));
}

export async function GET(req: Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) return NextResponse.json({ foods: [] });

  const apiKey = process.env.FDC_API_KEY || "DEMO_KEY";

  const res = await fetch("https://api.nal.usda.gov/fdc/v1/foods/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      pageSize: 12,
      dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"],
      api_key: apiKey
    }),
    cache: "no-store"
  });

  const data = await res.json();

  const foods = (data.foods || []).map((food:any) => ({
    fdcId: food.fdcId,
    food_name: food.description,
    brand: food.brandOwner || food.brandName || "",
    calories: nutrient(food, [1008]),
    protein: nutrient(food, [1003]),
    carbs: nutrient(food, [1005]),
    fats: nutrient(food, [1004]),
    serving: food.servingSize ? `${food.servingSize} ${food.servingSizeUnit || "g"}` : "100g",
  }));

  return NextResponse.json({ foods });
}
