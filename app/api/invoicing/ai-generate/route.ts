import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const { prompt } = await req.json();

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
      idempotencyKey: `invoice:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      client.responses.create({
        model: configured.model,
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
export const POST = withUsageRoute(post);
`,
      }),
  );

  let text = result.output_text || "{}";
  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return NextResponse.json({ success: true, invoice: JSON.parse(text) });
  } catch {
    return NextResponse.json(
      { error: "Could not generate invoice JSON." },
      { status: 500 },
    );
  }
}
