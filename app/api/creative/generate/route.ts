import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { generateCreativeAsset } from "@/lib/creative/generateCreativeAsset";
import { buildCreativeTemplatePrompt } from "@/lib/creative/templates/templates";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  const templateInput = body.templateKey
    ? buildCreativeTemplatePrompt(body.templateKey, body.prompt)
    : body;

  const result = await generateCreativeAsset(user.id, {
    ...body,
    ...templateInput,
  });

  return NextResponse.json(result);
}

