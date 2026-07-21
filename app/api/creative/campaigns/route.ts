import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";
import { generateCampaignCopy } from "@/lib/alma/creative/generateCampaignCopy";
import { modeConfiguration } from "@/lib/usage/modes";
import { UsageLimitError, withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";
export async function GET() {
  const { user, error } = await requirePaidUser();
  if (error) return error;
  const s = await createClient();
  const { data, error: dbError } = await s
    .from("creative_campaigns")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  return dbError
    ? NextResponse.json(
        { error: "Campaigns could not be loaded." },
        { status: 400 },
      )
    : NextResponse.json({ campaigns: data ?? [] });
}
async function post(request: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;
  const body = await request.json();
  if (!String(body.name ?? "").trim())
    return NextResponse.json(
      { error: "Campaign name is required." },
      { status: 400 },
    );
  let copy = {
    socialCaptions: body.socialCaptions ?? "",
    adCopy: body.adCopy ?? "",
    productPhotoPrompt: body.productPhotoPrompt ?? "",
  };
  if (body.generateCopy) {
    try {
      const configured = modeConfiguration("thinking");
      const text = await withUsageReservation(
        {
          userId: user.id,
          feature: "ai_request",
          mode: "thinking",
          model: configured.model,
          units: { requests: 1 },
          idempotencyKey: `campaign:${request.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
        },
        () =>
          generateCampaignCopy({
            brand: body.brandName,
            concept: body.concept,
            audience: body.audience,
            language: body.language,
          }),
      );
      if (text)
        copy = { socialCaptions: text, adCopy: text, productPhotoPrompt: text };
    } catch (error) {
      if (error instanceof UsageLimitError) throw error;
    }
  }
  const s = await createClient();
  const { data, error: dbError } = await s
    .from("creative_campaigns")
    .insert({
      user_id: user.id,
      brand_kit_id: body.brandKitId ?? null,
      folder_id: body.folderId ?? null,
      name: String(body.name).trim(),
      concept: body.concept ?? null,
      audience: body.audience ?? null,
      social_captions: copy.socialCaptions,
      ad_copy: copy.adCopy,
      product_photo_prompt: copy.productPhotoPrompt,
      metadata: body.metadata ?? {},
    })
    .select()
    .single();
  return dbError
    ? NextResponse.json(
        { error: "Campaign could not be saved." },
        { status: 400 },
      )
    : NextResponse.json({ campaign: data }, { status: 201 });
}
export const POST = withUsageRoute(post);
