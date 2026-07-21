import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildNocturaiPrompt } from "@/lib/creative/nocturaiPrompt";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const configured = modeConfiguration("instant");
  const prompt = await withUsageReservation(
    {
      userId: user.id,
      feature: "ai_request",
      mode: "instant",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `creative-prompt:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      buildNocturaiPrompt({
        useCase: body.useCase || "product_ad",
        platform: body.platform || "Shopify",
        brand: body.brand || "",
        audience: body.audience || "",
        brief: body.brief || "",
        hasProduct: Boolean(body.hasProduct),
      }),
  );

  return NextResponse.json({ success: true, prompt });
}
export const POST = withUsageRoute(post);
