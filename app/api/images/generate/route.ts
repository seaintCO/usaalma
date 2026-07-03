import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { generateImageTool } from "@/lib/tools/images/generateImageTool";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  if (!body.prompt) {
    return NextResponse.json({ error:"Missing prompt" }, { status:400 });
  }

  const result = await generateImageTool(user.id, body.prompt);

  return NextResponse.json(result);
}
