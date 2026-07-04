import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { buildNocturaiPrompt } from "@/lib/creative/nocturaiPrompt";

export async function POST(req:Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  const prompt = await buildNocturaiPrompt({
    useCase: body.useCase || "product_ad",
    platform: body.platform || "Shopify",
    brand: body.brand || "",
    audience: body.audience || "",
    brief: body.brief || "",
    hasProduct: Boolean(body.hasProduct),
  });

  return NextResponse.json({ success:true, prompt });
}
