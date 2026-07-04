import { NextResponse } from "next/server";
import { generateLaunchDemo } from "@/lib/launch-studio/generateLaunchDemo";
import { getTemplateInstruction } from "@/lib/launch-studio/templates";

export async function POST(req:Request) {
  const { prompt, template } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error:"Missing prompt" }, { status:400 });
  }

  const templatePrompt = `${getTemplateInstruction(template || "saas")}

User prompt:
${prompt}`;

  const demo = await generateLaunchDemo(templatePrompt);
  return NextResponse.json({ demo });
}
