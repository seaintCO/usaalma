import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";

export async function POST(req: Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  const { prompt } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result:any = await client.responses.create({
    model: (await import("@/lib/ai/models")).OPENAI_MODELS.deep,
    input: `
Create a professional invoice draft from this request:

${prompt}

Return ONLY valid JSON in this format:
{
  "clientName": "",
  "clientEmail": "",
  "clientAddress": "",
  "businessName": "ALMA / SEAINT",
  "businessEmail": "",
  "businessAddress": "",
  "invoiceTitle": "Professional Invoice",
  "invoiceNumber": "",
  "dueDate": "",
  "items": [
    { "description": "", "quantity": 1, "rate": 0 }
  ],
  "taxRate": 0,
  "notes": "",
  "terms": ""
}
`
  });

  let text = result.output_text || "{}";
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    return NextResponse.json({ success: true, invoice: JSON.parse(text) });
  } catch {
    return NextResponse.json({ error: "Could not generate invoice JSON." }, { status: 500 });
  }
}
