import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";

export async function POST(req: Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  const { plan } = await req.json();

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result:any = await client.responses.create({
    model: process.env.ALMA_MODEL || "gpt-5.5",
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
`
  });

  return NextResponse.json({ success:true, grocery: result.output_text });
}
