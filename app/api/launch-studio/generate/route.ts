import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkAiRateLimit } from "@/lib/security/rateLimit";
import { generateLaunchDemo } from "@/lib/launch-studio/generateLaunchDemo";
import { getTemplateInstruction } from "@/lib/launch-studio/templates";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser("launch_studio");
  if (error) return error;
  const { prompt, template, theme, website } = await req.json();

  if (website) {
    return NextResponse.json({ error: "Bot detected." }, { status: 400 });
  }

  if (typeof prompt !== "string" || prompt.trim().length < 5) {
    return NextResponse.json(
      { error: "Prompt is too short." },
      { status: 400 },
    );
  }

  if (prompt.length > 1500) {
    return NextResponse.json(
      { error: "Prompt is too long. Keep it under 1,500 characters." },
      { status: 400 },
    );
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";

  const rate = await checkAiRateLimit({
    userId: user.id,
    ip,
    feature: "launch_studio_generate",
    dailyLimit: 20,
    cooldownSeconds: 45,
  });

  if (!rate.allowed) {
    return NextResponse.json({ error: rate.reason }, { status: 429 });
  }

  const templatePrompt = `${getTemplateInstruction(template || "saas")}

User prompt:
${prompt}`;

  const configured = modeConfiguration("pro");
  const demo = await withUsageReservation(
    {
      userId: user.id,
      feature: "ai_request",
      mode: "pro",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `launch:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      generateLaunchDemo(
        templatePrompt,
        template || "saas",
        theme || "startup",
      ),
  );

  return NextResponse.json({ demo });
}
export const POST = withUsageRoute(post);
