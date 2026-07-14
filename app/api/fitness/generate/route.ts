import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";

export async function POST(req: Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  const data = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result:any = await client.responses.create({
    model: process.env.ALMA_MODEL || "gpt-4.1",
    input: `
You are ALMA Fitness, a premium health, meal planning, and workout assistant.

Create a personalized plan from this data:

Goal: ${data.goal}
Weight: ${data.weight}
Height: ${data.height}
Activity level: ${data.activity}
Diet preference: ${data.diet}
Workout equipment: ${data.equipment}
Days per week: ${data.days}
Notes: ${data.notes}

Create a classy, practical plan.

Do not use markdown hashtags.
Do not use asterisks.
Do not sound robotic.

Use this structure:

Daily Target
Calories:
Protein:
Carbs:
Fats:
Water:

Meal Plan
Breakfast:
Lunch:
Dinner:
Snacks:

Workout Plan
Day 1:
Day 2:
Day 3:
Day 4:
Day 5:

Grocery List
List the main foods to buy.

Progress Rules
Explain how to adjust weekly.

Important Note
This is general wellness guidance, not medical advice.
`
  });

  return NextResponse.json({ success: true, plan: result.output_text });
}
