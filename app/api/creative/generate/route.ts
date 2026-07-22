import { rememberEvent } from "@/lib/memory/almaMemory";
import { trackEvent } from "@/lib/analytics/track";
import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { generateCreativeAsset } from "@/lib/creative/generateCreativeAsset";
import { buildCreativeTemplatePrompt } from "@/lib/creative/templates/templates";
import { modeConfiguration } from "@/lib/usage/modes";
import { UsageLimitError, withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser("creative_studio");

  if (error) return error;

  try {
    const body = await req.json();

    if (!body.prompt) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing prompt.",
        },
        { status: 400 },
      );
    }

    const templateInput = body.templateKey
      ? buildCreativeTemplatePrompt(body.templateKey, body.prompt)
      : body;

    const requestKey =
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey
        : crypto.randomUUID();
    const configured = modeConfiguration("thinking");
    const result = await withUsageReservation(
      {
        userId: user.id,
        feature: "ai_request",
        mode: "thinking",
        model: configured.model,
        units: { requests: 1 },
        idempotencyKey: requestKey,
      },
      () =>
        generateCreativeAsset(user.id, {
          ...body,
          ...templateInput,
          folderId: body.folderId ?? null,
          brandKitId: body.brandKitId ?? null,
          campaignId: body.campaignId ?? null,
          idempotencyKey:
            typeof body.idempotencyKey === "string" ? requestKey : requestKey,
        }),
    );

    if (result?.success !== false) {
      await trackEvent(user.id, "nocturai_generated", {
        templateKey: body.templateKey,
        category: body.category,
      });
      await rememberEvent({
        userId: user.id,
        module: "nocturai",
        eventType: "image_generated",
        title: body.title || "Nocturai image generated",
        summary: body.prompt || "Creative asset generated.",
        metadata: { templateKey: body.templateKey, category: body.category },
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof UsageLimitError) throw error;
    console.error("CREATIVE_GENERATE_ERROR", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Creative generation failed.",
      },
      { status: 500 },
    );
  }
}
export const POST = withUsageRoute(post);
