import "server-only";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export function createElevenLabsClient(apiKey: string) {
  if (!apiKey.trim()) throw new Error("elevenlabs_api_key_missing");
  return new ElevenLabsClient({ apiKey: apiKey.trim() });
}

export async function validateElevenLabsApiKey(apiKey: string) {
  const client = createElevenLabsClient(apiKey);
  const user = await client.user.get();
  return {
    accountId: String(
      (user as unknown as Record<string, unknown>).userId ??
        (user as unknown as Record<string, unknown>).xiApiKey ??
        "elevenlabs-account",
    ),
  };
}

export async function createElevenLabsAgent(input: {
  apiKey: string;
  name: string;
  greeting: string;
  systemPrompt: string;
  language: "en" | "es" | "bilingual";
  voiceId?: string | null;
}) {
  const client = createElevenLabsClient(input.apiKey);
  const language = input.language === "es" ? "es" : "en";
  const result = await client.conversationalAi.agents.create({
    name: input.name,
    tags: ["alma", "customer-managed"],
    conversationConfig: {
      agent: {
        firstMessage: input.greeting,
        language,
        prompt: {
          prompt: `${input.systemPrompt}

You are connected through ALMA. Never claim to be human. Do not disclose private
workspace data unless the caller is authorized. Do not promise prices, refunds,
payments, appointments, or legal/accounting outcomes unless the user has
explicitly configured those facts and rules. Escalate uncertain or sensitive
requests to a human. If the caller asks for another language, respond in that
language when supported.`,
        },
      },
      ...(input.voiceId
        ? {
            tts: {
              voiceId: input.voiceId,
            },
          }
        : {}),
    },
  });
  return result.agentId;
}

export async function getElevenLabsSignedUrl(input: {
  apiKey: string;
  agentId: string;
}) {
  const client = createElevenLabsClient(input.apiKey);
  const result = await client.conversationalAi.conversations.getSignedUrl({
    agentId: input.agentId,
  });
  return result.signedUrl;
}
