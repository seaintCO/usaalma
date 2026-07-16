import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";

type UsdaNutrient = {
  nutrientName?: string;
  value?: number | string;
};

type UsdaFood = {
  fdcId?: number;
  description?: string;
  brandName?: string;
  brandOwner?: string;
  foodNutrients?: UsdaNutrient[];
};

function nutrient(food: UsdaFood, name: string) {
  const item = food.foodNutrients?.find((n) =>
    String(n.nutrientName || "")
      .toLowerCase()
      .includes(name),
  );
  return Math.round(Number(item?.value || 0));
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) return NextResponse.json([]);

  if (!process.env.USDA_FDC_API_KEY) {
    return NextResponse.json(
      { error: "USDA_UNAVAILABLE", foods: [] },
      { status: 503 },
    );
  }

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_FDC_API_KEY}&query=${encodeURIComponent(q)}&pageSize=8`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "USDA_TEMPORARY_FAILURE", foods: [] },
        { status: 502 },
      );
    }

    const json = await res.json();

    const foods = ((json.foods || []) as UsdaFood[]).map((food) => ({
      fdcId: food.fdcId,
      food_name: food.description,
      brand: food.brandName || food.brandOwner || "",
      calories: nutrient(food, "energy"),
      protein: nutrient(food, "protein"),
      carbs: nutrient(food, "carbohydrate"),
      fat: nutrient(food, "total lipid"),
      source: "USDA FDC",
    }));

    return NextResponse.json(foods);
  } catch {
    return NextResponse.json(
      { error: "USDA_TEMPORARY_FAILURE", foods: [] },
      { status: 502 },
    );
  }
}
