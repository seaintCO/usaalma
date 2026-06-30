import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { generateCreativeAsset } from "@/lib/creative/generateCreativeAsset";
import { buildCreativeTemplatePrompt } from "@/lib/creative/templates/templates";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  try {
    const body = await req.json();

    if (!body.prompt) {
      return NextResponse.json({
        success:false,
        message:"Missing prompt.",
      }, { status:400 });
    }

    const templateInput = body.templateKey
      ? buildCreativeTemplatePrompt(body.templateKey, body.prompt)
      : body;

    const result = await generateCreativeAsset(user.id, {
      ...body,
      ...templateInput,
    });

    return NextResponse.json(result);
  } catch (error:any) {
    console.error("CREATIVE_GENERATE_ERROR", {
      message:error?.message,
      stack:error?.stack,
    });

    return NextResponse.json({
      success:false,
      message:error?.message || "Creative generation failed.",
    }, { status:500 });
  }
}
