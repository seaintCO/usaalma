import OpenAI from "openai";
import { ImageRepository } from "@/lib/db/repositories/images/image.repository";
import { buildImagePrompt, normalizeImageSize } from "@/lib/ai/images/imagePromptRouter";

export async function generateImageTool(userId:string, prompt:string, size?:string) {
  if (!process.env.OPENAI_API_KEY) {
    return { success:false, message:"Falta configurar OPENAI_API_KEY." };
  }

  const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

  const result:any = await client.images.generate({
    model:process.env.ALMA_IMAGE_MODEL || "gpt-image-1",
    prompt:buildImagePrompt(prompt),
    size:normalizeImageSize(size),
    quality:"high",
  });

  const imageBase64 = result.data?.[0]?.b64_json;

  if (!imageBase64) {
    return { success:false, message:"No se pudo generar la imagen." };
  }

  const saved = await ImageRepository.create(userId, prompt, imageBase64);

  return {
    success:true,
    message:"Imagen generada correctamente.",
    image:{
      ...saved,
      outputBase64:imageBase64,
      prompt,
    },
  };
}
