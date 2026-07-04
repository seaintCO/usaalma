import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildNocturaiPrompt } from "@/lib/creative/nocturaiPrompt";

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

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
