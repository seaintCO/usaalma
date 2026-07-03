import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { generateBrandKit } from "@/lib/creative/brandKit";
import { CreativeAssetRepository } from "@/lib/db/repositories/creative/creativeAsset.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  if (!body.brandName) {
    return NextResponse.json({ error:"Missing brandName" }, { status:400 });
  }

  const kit = await generateBrandKit({
    brandName:body.brandName,
    industry:body.industry,
    style:body.style,
  });

  const saved = await CreativeAssetRepository.create(user.id, {
    type:"brand_kit",
    category:"brand_kits",
    title:`Brand Kit - ${body.brandName}`,
    prompt:JSON.stringify(body),
    optimizedPrompt:kit.logoPrompt || "",
    status:"completed",
    metadata:{ brandKit:kit },
  });

  return NextResponse.json({
    success:true,
    message:"Brand kit generated.",
    asset:saved,
    kit,
  });
}
