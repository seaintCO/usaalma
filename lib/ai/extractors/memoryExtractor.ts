import OpenAI from "openai";

export function extractExplicitMemory(message: string) {
  const text = message.trim().replace(/^(?:remember(?: this)?(?: forever| permanently)?|update my preference|recuerda(?: esto)?(?: para siempre)?|guarda esto|actualiza mi preferencia)\s*[:,-]?\s*/i, "");
  const rules: Array<[string, RegExp, string]> = [
    ["favorite_coffee", /(?:my favorite coffee is|mi caf[eé] favorito es|mi caf[eé] favorita es)\s+(.+?)[.!?]?$/i, "preference"],
    ["preferred_meeting_time", /(?:my preferred meeting time is|i now prefer meetings at|i prefer meetings at|prefiero reuniones a las|mi hora preferida para reuniones es)\s+(.+?)[.!?]?$/i, "preference"],
    ["preferred_language", /(?:my preferred language is|i prefer (?:to speak|responses? in)|mi idioma preferido es|prefiero (?:hablar|respuestas? en))\s+(.+?)[.!?]?$/i, "preference"],
    ["business_priorities", /(?:my business priorities are|my priorities are|mis prioridades(?: de negocio)? son)\s+(.+?)[.!?]?$/i, "business"],
    ["health_goals", /(?:my health goals are|my health goal is|mis metas de salud son|mi meta de salud es)\s+(.+?)[.!?]?$/i, "health"],
  ];
  for (const [key, pattern, category] of rules) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return { memories: [{ category, key, value: match[1].trim(), importance: 10 }] };
  }
  const match = message.match(/(?:remember(?: this)?(?: forever)?|recuerda(?: esto)?(?: para siempre)?)\.?\s*(?:my |mi )?(?:favorite|favorito|favorita)\s+([^.!?]+?)\s+(?:is|es)\s+([^.!?]+)[.!?]?$/i);
  if (!match) return null;
  const key = /coffee|caf[eé]/i.test(match[1]) ? "favorite_coffee" : `favorite ${match[1].trim()}`;
  return { memories: [{ category: "preference", key, value: match[2].trim(), importance: 10 }] };
}

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
