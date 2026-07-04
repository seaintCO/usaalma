import { NextResponse } from "next/server";
import { generateLaunchDemo } from "@/lib/launch-studio/generateLaunchDemo";

export async function POST(req:Request) {
  const { prompt } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error:"Missing prompt" }, { status:400 });
  }

  const demo = await generateLaunchDemo(prompt);
  return NextResponse.json({ demo });
}