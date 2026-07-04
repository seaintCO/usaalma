import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req:Request) {
  const body = await req.json();
  const businessName = body.businessName || "the business";
  const businessType = body.businessType || "service business";
  const callerMessage = body.callerMessage || "";
  const greeting = body.greeting || "";

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      response:`Thanks for calling ${businessName}. How can I help you today?`
    });
  }

  const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: process.env.ALMA_TEXT_MODEL || "gpt-4.1-mini",
    messages:[
      {
        role:"system",
        content:`You are ALMA Receptionist. You answer calls for ${businessName}, a ${businessType}.
Be professional, warm, short, and useful.
Capture caller name, phone, reason for calling, urgency, and preferred callback time.
Never say you are ChatGPT.`
      },
      {
        role:"user",
        content:`Greeting: ${greeting}
Caller said: ${callerMessage}

Respond as the phone receptionist.`
      }
    ]
  });

  return NextResponse.json({
    response: completion.choices[0]?.message?.content || `Thanks for calling ${businessName}. How can I help you today?`
  });
}
