import OpenAI from "openai";

export async function createEmbedding(text:string) {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.embeddings.create({
    model: (await import("@/lib/ai/models")).OPENAI_MODELS.embedding,
    input: text,
  });

  return response.data[0].embedding;
}
