import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const { plan } = await req.json();

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const configured = modeConfiguration("instant");
  const result: any = await withUsageReservation(
    {
      userId: user.id,
      feature: "ai_request",
      mode: "instant",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `grocery:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      client.responses.create({
        model: configured.model,
        input: `
Create a practical grocery list and weekly shopping checklist from this fitness plan.

Plan:
${plan}

Return clean sections:
Grocery List
Protein
Carbs
Fats
Vegetables
Fruits
Snacks
Supplements
Estimated Weekly Cost
Shopping Checklist

No markdown symbols.
`,
      }),
  );

  return NextResponse.json({ success: true, grocery: result.output_text });
}
export const POST = withUsageRoute(post);
