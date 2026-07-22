import OpenAI from "openai";
import { withUsageReservation } from "@/lib/usage/service";

export async function createEmbedding(
  userId: string,
  text: string,
  idempotencyKey = crypto.randomUUID(),
) {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const model = (await import("@/lib/ai/models")).OPENAI_MODELS.embedding;
  const pages = Math.max(1, Math.ceil(text.length / 3000));
  const response = await withUsageReservation(
    {
      userId,
      feature: "document_analysis",
      mode: null,
      model,
      units: { documentPages: pages },
      idempotencyKey: `embedding:${idempotencyKey}`,
    },
    () =>
      client.embeddings.create({
        model,
        input: text,
      }),
    { documentPages: pages },
  );

  return response.data[0].embedding;
}
