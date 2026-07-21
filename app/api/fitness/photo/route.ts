import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file)
    return NextResponse.json({ error: "Missing food photo" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const configured = modeConfiguration("thinking");
  const result: any = await withUsageReservation(
    {
      userId: user.id,
      feature: "document_analysis",
      mode: null,
      model: configured.model,
      units: { documentPages: 1 },
      idempotencyKey: `fitness-photo:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      client.responses.create({
        model: configured.model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Analyze this meal photo. Estimate calories, protein, carbs, and fats. Return ONLY valid JSON:
{
  "food_name":"",
  "calories":0,
  "protein":0,
  "carbs":0,
  "fats":0,
  "confidence":"low/medium/high",
  "notes":""
}`,
              },
              { type: "input_image", image_url: dataUrl, detail: "high" },
            ],
          },
        ],
      }),
  );

  let text = result.output_text || "{}";
  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return NextResponse.json({ success: true, estimate: JSON.parse(text) });
  } catch {
    return NextResponse.json(
      { error: "Could not estimate meal." },
      { status: 500 },
    );
  }
}
export const POST = withUsageRoute(post);
