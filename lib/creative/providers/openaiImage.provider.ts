import OpenAI from "openai";

export async function generateOpenAIImage(prompt:string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in Vercel env.");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const result:any = await client.images.generate({
      model:"gpt-image-1",
      prompt,
      size:"1024x1024",
      quality:"high",
    });

    const imageBase64 = result.data?.[0]?.b64_json;

    if (!imageBase64) {
      console.error("OpenAI image response missing b64_json:", result);
      throw new Error("OpenAI did not return image data.");
    }

    return imageBase64;
  } catch (error:any) {
    console.error("OPENAI_IMAGE_GENERATION_ERROR", {
      message:error?.message,
      status:error?.status,
      code:error?.code,
      type:error?.type,
    });

    throw new Error(error?.message || "Image generation failed.");
  }
}
