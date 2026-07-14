import OpenAI from "openai";

export async function extractMemory(message:string) {
  if (!process.env.OPENAI_API_KEY) {
    return { memories: [] };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model: (await import("@/lib/ai/models")).OPENAI_MODELS.deep,
    text: {
      format: {
        type: "json_schema",
        name: "memory",
        schema: {
          type: "object",
          properties: {
            memories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  key: { type: "string" },
                  value: { type: "string" },
                  importance: { type: "number" }
                },
                required: ["category", "key", "value", "importance"],
                additionalProperties: false
              }
            }
          },
          required: ["memories"],
          additionalProperties: false
        }
      }
    },
    input: [
      {
        role: "system",
        content: "Extract long-term memories from the user's message. Only include facts worth remembering."
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  return JSON.parse(response.output_text || '{"memories":[]}');
}
