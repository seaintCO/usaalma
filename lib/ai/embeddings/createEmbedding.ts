import OpenAI from "openai";

export async function createEmbedding(text:string) {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}
