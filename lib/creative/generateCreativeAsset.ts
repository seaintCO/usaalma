import { CreativeAssetRepository } from "@/lib/db/repositories/creative/creativeAsset.repository";
import { optimizeCreativePrompt } from "./promptOptimizer";
import { generateOpenAIImage } from "./providers/openaiImage.provider";
import { buildImagePrompt, detectImageCategory } from "@/lib/ai/images/imagePromptRouter";

export async function generateCreativeAsset(userId:string, input:any) {
  const type = input.type ?? "image";
  const detectedCategory = detectImageCategory(input.prompt || "");
  const category = input.category && input.category !== "general" ? input.category : detectedCategory;
  const prompt = input.prompt;

  if (!prompt) {
    return { success:false, message:"Missing prompt." };
  }

  if (type !== "image") {
    const saved = await CreativeAssetRepository.create(userId, {
      type,
      category,
      title:input.title ?? `${category} concept`,
      prompt,
      optimizedPrompt:prompt,
      status:"draft",
      metadata:{
        note:"This generation type is planned. Image generation is active first.",
      },
    });

    return {
      success:true,
      message:`${type} concept saved. Full generation coming soon.`,
      asset:saved,
    };
  }

  const routedPrompt = buildImagePrompt(prompt);

  const optimizedPrompt = await optimizeCreativePrompt({
    prompt:routedPrompt,
    category,
    type,
  });

  const outputBase64 = await generateOpenAIImage(optimizedPrompt);

  const saved = await CreativeAssetRepository.create(userId, {
    type,
    category,
    title:input.title ?? category,
    prompt,
    optimizedPrompt,
    outputBase64,
    provider:"openai",
    status:"completed",
  });

  return {
    success:true,
    message:"Creative asset generated.",
    asset:saved,
  };
}
