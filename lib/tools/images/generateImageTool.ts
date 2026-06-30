import OpenAI from "openai";
import { ImageRepository } from "@/lib/db/repositories/images/image.repository";
import { optimizeImagePrompt } from "@/lib/ai/images/optimizeImagePrompt";
import { buildImagePrompt } from "@/lib/ai/images/imagePromptRouter";

export async function generateImageTool(userId:string, prompt:string) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      success:false,
      message:"Falta configurar OPENAI_API_KEY.",
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const routedPrompt = buildImagePrompt(prompt);
  const optimizedPrompt = await optimizeImagePrompt(routedPrompt);

  const result:any = await client.images.generate({
    model:"gpt-image-1",
    prompt:optimizedPrompt,
    size:"1024x1024",
    quality:"high",
  });

  const imageBase64 = result.data?.[0]?.b64_json;

  if (!imageBase64) {
    return {
      success:false,
      message:"No se pudo generar la imagen.",
    };
  }

  const saved = await ImageRepository.create(userId, prompt, imageBase64);

  return {
    success:true,
    message:"Imagen generada correctamente.",
    image:{
      ...saved,
      outputBase64:imageBase64,
      prompt,
      optimizedPrompt,
    },
  };
}
