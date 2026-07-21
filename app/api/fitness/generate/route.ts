import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const data = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const configured = modeConfiguration("thinking");
  const result: any = await withUsageReservation(
    {
      userId: user.id,
      feature: "ai_request",
      mode: "thinking",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `fitness-generate:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      client.responses.create({
        model: configured.model,
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
`,
      }),
  );

  return NextResponse.json({ success: true, plan: result.output_text });
}
export const POST = withUsageRoute(post);
