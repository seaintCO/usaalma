import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/security/rateLimit";
import { generateLaunchDemo } from "@/lib/launch-studio/generateLaunchDemo";
import { getTemplateInstruction } from "@/lib/launch-studio/templates";

export async function POST(req:Request) {
  const { prompt, template, theme, website } = await req.json();

  if (website) {
    return NextResponse.json({ error:"Bot detected." }, { status:400 });
  }

  if (typeof prompt !== "string" || prompt.trim().length < 5) {
    return NextResponse.json({ error:"Prompt is too short." }, { status:400 });
  }

  if (prompt.length > 1500) {
    return NextResponse.json({ error:"Prompt is too long. Keep it under 1,500 characters." }, { status:400 });
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";

  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  const rate = await checkAiRateLimit({
    userId:user?.id,
    ip,
    feature:"launch_studio_generate",
    dailyLimit:user ? 20 : 3,
    cooldownSeconds:45
  });

  if (!rate.allowed) {
    return NextResponse.json({ error:rate.reason }, { status:429 });
  }

  const templatePrompt = `${getTemplateInstruction(template || "saas")}

User prompt:
${prompt}`;

  const demo = await generateLaunchDemo(templatePrompt, template || "saas", theme || "startup");

  return NextResponse.json({ demo });
}
