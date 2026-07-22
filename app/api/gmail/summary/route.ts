import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { searchGmail } from "@/lib/google/gmail";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { UsageLimitError } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  try {
    const emails = await searchGmail(
      user.id,
      body.query ?? "in:inbox newer_than:7d",
      body.maxResults ?? 10,
    );

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        summary: emails
          .map((e: any) => `${e.subject} — ${e.snippet}`)
          .join("\n"),
        emails,
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const configured = modeConfiguration("thinking");
    const response = await withUsageReservation(
      {
        userId: user.id,
        feature: "ai_request",
        mode: "thinking",
        model: configured.model,
        units: { requests: 1 },
        idempotencyKey: `gmail-summary:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
      },
      () =>
        client.responses.create({
          model: configured.model,
          input: `Summarize these Gmail messages clearly. Include what matters, who sent it, and suggested follow-ups.\n\n${JSON.stringify(emails, null, 2)}`,
        }),
    );

    return NextResponse.json({
      success: true,
      summary: response.output_text,
      emails,
    });
  } catch (error) {
    if (error instanceof UsageLimitError) throw error;
    return NextResponse.json(
      {
        success: false,
        error: "Connect Gmail first or try again.",
      },
      { status: 400 },
    );
  }
}
export const POST = withUsageRoute(post);
