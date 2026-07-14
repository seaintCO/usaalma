import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";

export async function POST(req: Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result:any = await client.responses.create({
    model: process.env.ALMA_MODEL || "gpt-4.1",
    input: `
You are ALMA Fitness Coach.

Based on:
Calories today: ${body.dailyCalories}
Protein today: ${body.dailyProtein}
Calorie goal: ${body.calorieGoal}
Protein goal: ${body.proteinGoal}
Recent weight: ${body.weight}
Goal: ${body.goal}

Give a weekly adjustment recommendation:
Calories
Protein
Training
Cardio
Recovery
Next Week Focus

Do not use markdown. This is general wellness guidance, not medical advice.
`
  });

  return NextResponse.json({ success:true, advice: result.output_text });
}
