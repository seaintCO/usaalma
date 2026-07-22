import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { generateBrandKit } from "@/lib/creative/brandKit";
import { CreativeAssetRepository } from "@/lib/db/repositories/creative/creativeAsset.repository";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  if (!body.brandName) {
    return NextResponse.json({ error: "Missing brandName" }, { status: 400 });
  }

  const configured = modeConfiguration("thinking");
  const kit = await withUsageReservation(
    {
      userId: user.id,
      feature: "ai_request",
      mode: "thinking",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `brand-kit:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      generateBrandKit({
        brandName: body.brandName,
        industry: body.industry,
        style: body.style,
      }),
  );

  const saved = await CreativeAssetRepository.create(user.id, {
    type: "brand_kit",
    category: "brand_kits",
    title: `Brand Kit - ${body.brandName}`,
    prompt: JSON.stringify(body),
    optimizedPrompt: kit.logoPrompt || "",
    status: "completed",
    metadata: { brandKit: kit },
  });

  return NextResponse.json({
    success: true,
    message: "Brand kit generated.",
    asset: saved,
    kit,
  });
}
export const POST = withUsageRoute(post);
