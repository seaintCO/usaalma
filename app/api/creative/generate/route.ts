import { rememberEvent } from "@/lib/memory/almaMemory";
import { checkImageCredits, recordImageUsage } from "@/lib/usage/imageCredits";
import { trackEvent } from "@/lib/analytics/track";
import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { generateCreativeAsset } from "@/lib/creative/generateCreativeAsset";
import { buildCreativeTemplatePrompt } from "@/lib/creative/templates/templates";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  try {
    const body = await req.json();

    const credits = await checkImageCredits(user.id, 1);
    if (!credits.allowed) {
      await trackEvent(user.id, "nocturai_credit_blocked", { used:credits.used, limit:credits.limit });
      return NextResponse.json({ success:false, message:credits.message, credits }, { status:429 });
    }

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
      folderId: body.folderId ?? null,
      brandKitId: body.brandKitId ?? null,
      campaignId: body.campaignId ?? null,
      idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
    });

    if (result?.success !== false) {
      await recordImageUsage(user.id, 1, { source:"creative_generate", templateKey:body.templateKey });
      await trackEvent(user.id, "nocturai_generated", { templateKey:body.templateKey, category:body.category });
      await rememberEvent({
        userId:user.id,
        module:"nocturai",
        eventType:"image_generated",
        title:body.title || "Nocturai image generated",
        summary:body.prompt || "Creative asset generated.",
        metadata:{ templateKey:body.templateKey, category:body.category }
      });
    }

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

