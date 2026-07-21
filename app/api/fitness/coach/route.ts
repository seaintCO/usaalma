import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const configured = modeConfiguration("thinking");
  const result: any = await withUsageReservation(
    {
      userId: user.id,
      feature: "ai_request",
      mode: "thinking",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `fitness-coach:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      client.responses.create({
        model: configured.model,
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
`,
      }),
  );

  return NextResponse.json({ success: true, advice: result.output_text });
}
export const POST = withUsageRoute(post);
