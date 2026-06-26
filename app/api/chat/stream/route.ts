import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth/user";
import { buildContext } from "@/lib/ai/memory/context";
import { buildIntegrationContext } from "@/lib/ai/integrations/context";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { extractMemory } from "@/lib/ai/extractors/memoryExtractor";
import { saveExtractedMemory } from "@/lib/ai/memory/saveMemory";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return new Response("Unauthorized", { status:401 });

  const body = await req.json();
  const message = body.message;
  let conversationId = body.conversationId;

  if (!message) return new Response("Mensaje vacío", { status:400 });
  if (!process.env.OPENAI_API_KEY) return new Response("Falta OPENAI_API_KEY", { status:500 });

  if (!conversationId) {
    const title = message.length > 40 ? message.slice(0, 40) + "..." : message;
    const conversation = await ConversationRepository.create(user.id, title);
    conversationId = conversation.id;
  }

  await MessageRepository.create(conversationId, user.id, "user", message);

  try {
    const extracted = await extractMemory(message);
    await saveExtractedMemory(user.id, extracted);
  } catch {
    // Memory extraction should not break streaming.
  }

  const memoryContext = await buildContext(user.id);
  const integrationContext = await buildIntegrationContext(user.id);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await client.responses.create({
    model: process.env.ALMA_MODEL || "gpt-5.5",
    stream: true,
    input: `
Eres ALMA, un asistente personal y empresarial creado por SEAINT.

Idioma principal: español.
Idioma secundario: inglés.
Nunca digas que eres ChatGPT.
Sé clara, práctica, elegante y útil.

Integraciones conectadas:
${integrationContext}

Memoria del usuario:
${memoryContext || "Sin memoria guardada todavía."}

Usuario:
${message}
`
  });

  const encoder = new TextEncoder();
  let fullReply = "";

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`[CONVERSATION_ID:${conversationId}]\n`));

      try {
        for await (const event of stream as any) {
          if (event.type === "response.output_text.delta") {
            fullReply += event.delta;
            controller.enqueue(encoder.encode(event.delta));
          }
        }

        await MessageRepository.create(conversationId, user.id, "assistant", fullReply);
      } catch {
        controller.enqueue(encoder.encode("\n\nALMA tuvo un error generando la respuesta."));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

