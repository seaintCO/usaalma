import OpenAI from "openai";
import { buildImagePrompt, normalizeImageSize } from "@/lib/ai/images/imagePromptRouter";

export async function generateOpenAIImage(prompt:string, size?:string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in Vercel env.");
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
    throw new Error("OpenAI did not return image data.");
  }

  return imageBase64;
}
