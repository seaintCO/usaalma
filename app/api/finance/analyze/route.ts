import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { buildMarketAnalysisPrompt } from "@/lib/ai/finance/marketPrompt";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const { symbol, question } = await req.json();

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
      idempotencyKey: `finance:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      client.responses.create({
        model: configured.model,
        input: buildMarketAnalysisPrompt(
          symbol || "Market",
          question || "Give me daily market analysis and key levels.",
        ),
      }),
  );

  return NextResponse.json({ success: true, answer: result.output_text });
}
export const POST = withUsageRoute(post);
