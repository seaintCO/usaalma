import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { searchGmail } from "@/lib/google/gmail";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  try {
    const emails = await searchGmail(
      user.id,
      body.query ?? "in:inbox newer_than:7d",
      body.maxResults ?? 10
    );

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success:true,
        summary:emails.map((e:any) => `${e.subject} — ${e.snippet}`).join("\n"),
        emails,
      });
    }

    const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model:process.env.ALMA_MODEL || "gpt-4.1",
      input:`Summarize these Gmail messages clearly. Include what matters, who sent it, and suggested follow-ups.\n\n${JSON.stringify(emails, null, 2)}`
    });

    return NextResponse.json({
      success:true,
      summary:response.output_text,
      emails,
    });
  } catch {
    return NextResponse.json({
      success:false,
      error:"Connect Gmail first or try again.",
    }, { status:400 });
  }
}
