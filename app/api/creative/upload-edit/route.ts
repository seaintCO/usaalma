import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { CreativeAssetRepository } from "@/lib/db/repositories/creative/creativeAsset.repository";
import { editOpenAIImage } from "@/lib/creative/providers/openaiImageEdit.provider";
import {
  releaseUsage,
  reserveUsage,
  settleUsage,
  UsageLimitError,
} from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

function actionPrompt(action: string, userPrompt: string) {
  const custom = userPrompt?.trim();

  const prompts: any = {
    remove_background:
      "Remove the background completely. Keep the main subject sharp, realistic, clean, high-resolution, with natural edges and professional studio quality.",

    replace_background: `Replace the background with a premium realistic commercial background. Keep the subject unchanged, realistic lighting, natural shadows, and high-end photography quality. ${custom}`,

    expand_image: `Expand the image naturally beyond its original frame. Continue the environment, lighting, perspective, textures, and realism seamlessly. ${custom}`,

    object_removal: `Remove the unwanted object described by the user. Preserve the rest of the scene, texture, lighting, shadows, and realism. ${custom}`,

    relighting: `Relight the image with premium cinematic lighting, natural contrast, realistic shadows, clean highlights, and commercial photography quality. ${custom}`,

    upscaling:
      "Enhance the image quality, sharpness, clarity, detail, and professional finish while keeping it natural and realistic.",
  };

  return (
    prompts[action] ||
    custom ||
    "Edit this image professionally while preserving realism and quality."
  );
}

async function post(req: Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const action = form.get("action")?.toString() || "edit";
    const prompt = form.get("prompt")?.toString() || "";

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const inputBase64 = Buffer.from(bytes).toString("base64");

    const finalPrompt = actionPrompt(action, prompt);

    const usage = await reserveUsage({
      userId: user.id,
      feature: "image_generation",
      mode: null,
      model: (await import("@/lib/ai/models")).OPENAI_MODELS.image,
      units: { images: 1 },
      idempotencyKey: `creative-edit:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    });
    let editedBase64: string;
    try {
      editedBase64 = await editOpenAIImage({
        imageBase64: inputBase64,
        mimeType: file.type || "image/png",
        prompt: finalPrompt,
      });
      await settleUsage(usage, { images: 1 });
    } catch (providerError) {
      await releaseUsage(usage);
      throw providerError;
    }

    const saved = await CreativeAssetRepository.create(user.id, {
      type: "edit",
      category: action,
      title: `Image Edit - ${action}`,
      prompt: prompt || `Image edit: ${action}`,
      optimizedPrompt: finalPrompt,
      inputBase64,
      outputBase64: editedBase64,
      provider: "openai",
      status: "completed",
      metadata: {
        action,
        fileName: file.name,
        fileType: file.type,
      },
      folderId: form.get("folderId")?.toString() || null,
    });

    return NextResponse.json({
      success: true,
      message: "Image edited successfully.",
      asset: saved,
    });
  } catch (error) {
    if (error instanceof UsageLimitError) throw error;
    return NextResponse.json(
      {
        success: false,
        message:
          "No se pudo editar la imagen. Verifica OPENAI_API_KEY y vuelve a intentar.",
      },
      { status: 500 },
    );
  }
}
export const POST = withUsageRoute(post);
