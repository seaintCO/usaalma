import OpenAI from "openai";

export async function generateOpenAIImage(prompt:string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result:any = await client.images.generate({
    model:"gpt-image-1",
    prompt,
    size:"1024x1024",
  });

  const imageBase64 = result.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("Image generation failed");
  }

  return imageBase64;
}
