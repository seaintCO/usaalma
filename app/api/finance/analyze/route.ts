import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";

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
    input: `
You are ALMA Finance, an elite market analyst.

Analyze this symbol: ${symbol}

User request:
${question}

Give:
1. Market bias
2. Key levels
3. Bullish scenario
4. Bearish scenario
5. What to watch
6. Risk warning

Do not claim certainty. Do not give guaranteed financial advice.
`
  });

  return NextResponse.json({ success: true, answer: result.output_text });
}
