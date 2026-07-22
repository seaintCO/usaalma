import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser("receptionist");
  if (error) return error;
  const body = await req.json();
  const businessName = body.businessName || "the business";
  const businessType = body.businessType || "service business";
  const callerMessage = body.callerMessage || "";
  const greeting = body.greeting || "";

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      response: `Thanks for calling ${businessName}. How can I help you today?`,
    });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const configured = modeConfiguration("instant");
  const completion = await withUsageReservation(
    {
      userId: user.id,
      feature: "ai_request",
      mode: "instant",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `receptionist:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      client.chat.completions.create({
        model: configured.model,
        messages: [
          {
            role: "system",
            content: `You are ALMA Receptionist. You answer calls for ${businessName}, a ${businessType}.
Be professional, warm, short, and useful.
Capture caller name, phone, reason for calling, urgency, and preferred callback time.
Never say you are ChatGPT.`,
          },
          {
            role: "user",
            content: `Greeting: ${greeting}
Caller said: ${callerMessage}

Respond as the phone receptionist.`,
          },
        ],
      }),
  );

  return NextResponse.json({
    response:
      completion.choices[0]?.message?.content ||
      `Thanks for calling ${businessName}. How can I help you today?`,
  });
}
export const POST = withUsageRoute(post);
