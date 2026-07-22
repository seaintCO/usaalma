import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("alma_site_projects")
    .select("*")
    .eq("id", body.projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const configured = modeConfiguration("pro");
  const completion = await withUsageReservation(
    {
      userId: user.id,
      feature: "ai_request",
      mode: "pro",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `site-edit:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      client.chat.completions.create({
        model: configured.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Edit the existing website. Return JSON only with current_copy and current_code. Preserve working React/Tailwind component format. No markdown.",
          },
          {
            role: "user",
            content: `Current code:
${project.current_code}

Edit request:
${body.instruction}`,
          },
        ],
      }),
  );

  const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");

  const { data, error: dbError } = await supabase
    .from("alma_site_projects")
    .update({
      current_copy: parsed.current_copy || project.current_copy,
      current_code: parsed.current_code || project.current_code,
      updated_at: new Date().toISOString(),
    })
    .eq("id", project.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 400 });

  return NextResponse.json({ success: true, project: data });
}
export const POST = withUsageRoute(post);
