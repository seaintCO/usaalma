import { NextResponse } from "next/server";
import { generateLaunchDemo } from "@/lib/launch-studio/generateLaunchDemo";

export async function POST(req:Request) {
  const { demo, instruction } = await req.json();

  if (!demo || !instruction) {
    return NextResponse.json({ error:"Missing demo or instruction" }, { status:400 });
  }

  const prompt = `
Edit this existing live demo based on the instruction.

Instruction:
${instruction}

Existing demo JSON:
${JSON.stringify(demo)}

Return the improved full demo JSON.
`;

  const updated = await generateLaunchDemo(prompt);
  return NextResponse.json({ demo:{ ...demo, ...updated } });
}
