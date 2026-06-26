import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { CreativeAssetRepository } from "@/lib/db/repositories/creative/creativeAsset.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const action = form.get("action")?.toString() || "edit";
  const prompt = form.get("prompt")?.toString() || "";

  if (!file) {
    return NextResponse.json({ error:"Missing file" }, { status:400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const saved = await CreativeAssetRepository.create(user.id, {
    type:"edit",
    category:action,
    title:`Image Edit - ${action}`,
    prompt:prompt || `Image edit: ${action}`,
    optimizedPrompt:prompt || `Image edit: ${action}`,
    outputBase64:base64,
    provider:"upload",
    status:"draft",
    metadata:{
      action,
      fileName:file.name,
      fileType:file.type,
      note:"Uploaded image saved. Provider edit generation will be connected next."
    },
  });

  return NextResponse.json({
    success:true,
    message:"Image uploaded for editing.",
    asset:saved,
  });
}
