import OpenAI, { toFile } from "openai";

export async function editOpenAIImage(input:{
  imageBase64:string;
  mimeType:string;
  prompt:string;
  size?: "1024x1024" | "1536x1024" | "1024x1536";
  quality?: "medium" | "high";
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const buffer = Buffer.from(input.imageBase64, "base64");

  const file = await toFile(
    buffer,
    "input-image.png",
    { type: input.mimeType || "image/png" }
  );

  const result:any = await client.images.edit({
    model:(await import("@/lib/ai/models")).OPENAI_MODELS.image,
    image:file,
    prompt:input.prompt,
    size:input.size ?? "1024x1024",
    quality:input.quality ?? "high",
  });

  const editedBase64 = result.data?.[0]?.b64_json;

  if (!editedBase64) {
    throw new Error("Image edit failed");
  }

  return editedBase64;
}
