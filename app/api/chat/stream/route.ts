import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth/user";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { extractExplicitMemory, extractMemory } from "@/lib/ai/extractors/memoryExtractor";
import { saveExtractedMemory } from "@/lib/ai/memory/saveMemory";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { chooseAlmaModel } from "@/lib/alma/modelRouter";
import { normalizeChatRunLanguage } from "@/lib/alma/chat/chatExecutionHelpers";
import { completeChatRunTracking } from "@/lib/alma/chat/processChatRun";
import { processPlannerAndToolChatRun } from "@/lib/alma/chat/processPlannerAndToolChatRun";

function createChatStreamResponse(input: { userId: string; conversationId: string; message: string; language: "en" | "es" | "auto" }) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`[CONVERSATION_ID:${input.conversationId}]\n`));
      try {
        const processor = await processPlannerAndToolChatRun({
          userId: input.userId,
          conversationId: input.conversationId,
          userMessage: input.message,
          language: input.language,
          onProgress: async (event) => {
            if (event.type === "status") controller.enqueue(encoder.encode(event.message));
            if (event.type === "text_delta") controller.enqueue(encoder.encode(event.delta));
            if (event.type === "image") controller.enqueue(encoder.encode(event.content));
          },
        });
        if (processor.handled) return;

        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const stream = await client.responses.create({
          model: chooseAlmaModel(input.message, "auto"),
          stream: true,
          input: [
            { role: "system", content: processor.systemPrompt },
            { role: "user", content: input.message },
          ],
        });
        let fullReply = "";
        try {
          for await (const event of stream as any) {
            if (event.type === "response.output_text.delta") {
              fullReply += event.delta;
              controller.enqueue(encoder.encode(event.delta));
            }
          }
          await MessageRepository.create(input.conversationId, input.userId, "assistant", fullReply);
          await completeChatRunTracking({ tracked: processor.tracking, userId: input.userId, success: true, summary: "ALMA completed a chat execution.", result: { route: "chat" } });
        } catch {
          const reply = input.language === "en" ? "\n\nALMA had an error generating the response." : "\n\nALMA tuvo un error generando la respuesta.";
          controller.enqueue(encoder.encode(reply));
          await completeChatRunTracking({ tracked: processor.tracking, userId: input.userId, success: false, summary: "ALMA chat execution failed.", error: "Streaming response failed" });
        }
      } catch (error) {
        console.error("ALMA_CHAT_PROCESSOR_ERROR", error);
        const reply = input.language === "en" ? "ALMA could not process that request right now." : "ALMA no pudo procesar esa solicitud ahora.";
        controller.enqueue(encoder.encode(reply));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: { message?: unknown; conversationId?: unknown; language?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON request body", { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  let conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const language = normalizeChatRunLanguage(body.language);

  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const encoder = new TextEncoder();
    const demoReply = "Claro. Estoy en modo demo local. Puedo mostrarte cómo ALMA funcionará: chat en vivo, memoria, tareas, notas, CRM, facturación, documentos, workflows, marketplace y recepcionista IA. Cuando conectes Supabase, OpenAI y Stripe, estas acciones se guardarán y funcionarán en producción.";
    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode("[CONVERSATION_ID:demo-live]\n"));
        for (const word of demoReply.split(" ")) {
          controller.enqueue(encoder.encode(`${word} `));
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        controller.close();
      },
    });
    return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
  }

  if (!message) return new Response("Mensaje vacío", { status: 400 });
  let subscription;
  try {
    subscription = await SubscriptionRepository.get(user.id);
  } catch {
    return new Response("Subscription service is unavailable. Please try again shortly.", { status: 503 });
  }
  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return new Response("Tu suscripción no está activa. Ve a Billing para activar ALMA.", { status: 402 });
  }
  if (!process.env.OPENAI_API_KEY) return new Response("Falta OPENAI_API_KEY", { status: 500 });

  if (!conversationId) {
    const title = message.length > 40 ? `${message.slice(0, 40)}...` : message;
    const conversation = await ConversationRepository.create(user.id, title);
    conversationId = conversation.id;
  }
  await MessageRepository.create(conversationId, user.id, "user", message);

  const explicitMemory = extractExplicitMemory(message);
  try {
    await saveExtractedMemory(user.id, explicitMemory ?? await extractMemory(message));
  } catch (error) {
    if (explicitMemory) {
      return new Response(language === "es" ? "ALMA no pudo guardar ese recuerdo. Inténtalo de nuevo." : "ALMA could not save that memory. Please try again.", { status: 503 });
    }
    console.error("ALMA_MEMORY_SAVE_ERROR", error);
  }

  return createChatStreamResponse({ userId: user.id, conversationId, message, language });
}
