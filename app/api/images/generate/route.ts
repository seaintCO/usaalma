import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { generateImageTool } from "@/lib/tools/images/generateImageTool";

export async function POST(req: Request) {
  const { user, error } = await requirePaidUser("images");

  if (error) return error;

  const body = await req.json();

  if (!body.prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const result = await generateImageTool(
    user.id,
    String(body.prompt),
    undefined,
    {
      aspectRatio: body.aspectRatio,
      quality: body.quality,
      idempotencyKey:
        typeof body.idempotencyKey === "string"
          ? body.idempotencyKey
          : undefined,
    },
  );

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
