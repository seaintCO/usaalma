import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { buildMarketAnalysisPrompt } from "@/lib/ai/finance/marketPrompt";

export async function POST(req: Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  const { symbol, question } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result:any = await client.responses.create({
    model: process.env.ALMA_MODEL || "gpt-5.5",
    input: buildMarketAnalysisPrompt(symbol || "Market", question || "Give me daily market analysis and key levels.")
  });

  return NextResponse.json({ success: true, answer: result.output_text });
}
