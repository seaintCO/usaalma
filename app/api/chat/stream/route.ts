import { normalizeChatRunLanguage } from "@/lib/alma/chat/chatExecutionHelpers";
import { processCanonicalChatRun } from "@/lib/alma/chat/processChatRun";
import { extractExplicitMemory } from "@/lib/ai/extractors/memoryExtractor";
import { saveExtractedMemory } from "@/lib/ai/memory/saveMemory";
import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { parseClientMode, type SelectableAlmaMode } from "@/lib/usage/modes";
import { UsageLimitError, usageErrorPayload } from "@/lib/usage/service";

type StreamInput = {
  userId: string;
  conversationId: string;
  message: string;
  language: "en" | "es" | "auto";
  idempotencyKey?: string | null;
  mode: SelectableAlmaMode;
};

function encodeTerminalError(input: {
  code: string;
  category: string;
  message: string;
}) {
  return `[ALMA_ERROR:${JSON.stringify(input)}]\n`;
}

function createChatStreamResponse(input: StreamInput) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`[CONVERSATION_ID:${input.conversationId}]\n`),
      );
      try {
        let terminalFailureEmitted = false;
        const result = await processCanonicalChatRun({
          userId: input.userId,
          conversationId: input.conversationId,
          userMessage: input.message,
          language: input.language,
          idempotencyKey: input.idempotencyKey ?? undefined,
          mode: input.mode,
          onProgress: async (event) => {
            if (event.type === "status") {
              controller.enqueue(encoder.encode(event.message));
            }
            if (event.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta));
            }
            if (event.type === "image") {
              controller.enqueue(encoder.encode(event.content));
            }
            if (event.type === "failed") {
              terminalFailureEmitted = true;
              controller.enqueue(
                encoder.encode(
                  encodeTerminalError({
                    code: event.error.code,
                    category: "server_unavailable",
                    message: event.error.message,
                  }),
                ),
              );
            }
          },
        });
        if (!result.ok && !terminalFailureEmitted) {
          controller.enqueue(
            encoder.encode(
              encodeTerminalError({
                code: result.code,
                category: "server_unavailable",
                message: result.message,
              }),
            ),
          );
        }
      } catch (error) {
        if (error instanceof UsageLimitError) {
          controller.enqueue(
            encoder.encode(
              encodeTerminalError({
                code: error.code,
                category: "rate_limited",
                message: JSON.stringify(usageErrorPayload(error).message),
              }),
            ),
          );
          return;
        }
        console.error("ALMA_CHAT_PROCESSOR_ERROR", {
          conversationId: input.conversationId,
          idempotencyKey: input.idempotencyKey ?? null,
          error: error instanceof Error ? error.message : "processor failed",
        });
        const reply =
          input.language === "en"
            ? "ALMA could not process that request right now."
            : "ALMA no pudo procesar esa solicitud ahora.";
        controller.enqueue(encoder.encode(reply));
        controller.enqueue(
          encoder.encode(
            encodeTerminalError({
              code: "chat_processor_failed",
              category: "server_unavailable",
              message: reply,
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: {
    message?: unknown;
    conversationId?: unknown;
    language?: unknown;
    idempotencyKey?: unknown;
    mode?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON request body", { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  let conversationId =
    typeof body.conversationId === "string" ? body.conversationId : "";
  const language = normalizeChatRunLanguage(body.language);
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.length >= 16
      ? body.idempotencyKey.slice(0, 160)
      : null;
  const mode = body.mode === undefined ? "instant" : parseClientMode(body.mode);
  if (!mode)
    return Response.json({ ok: false, error: "invalid_mode" }, { status: 400 });

  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const encoder = new TextEncoder();
    const demoReply =
      "Claro. Estoy en modo demo local. Puedo mostrarte como ALMA funcionara: chat en vivo, memoria, tareas, notas, CRM, facturacion, documentos, workflows, marketplace y recepcionista IA. Cuando conectes Supabase, OpenAI y Stripe, estas acciones se guardaran y funcionaran en produccion.";
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
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  if (!message) return new Response("Message is required", { status: 400 });

  let subscription;
  try {
    subscription = await SubscriptionRepository.get(user.id);
  } catch {
    return new Response("Subscription service is unavailable.", {
      status: 503,
    });
  }
  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return new Response("Subscription inactive", { status: 402 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return new Response("Chat provider is unavailable.", { status: 503 });
  }

  if (!conversationId && idempotencyKey) {
    const existingMessage = await MessageRepository.findUserByIdempotency({
      userId: user.id,
      idempotencyKey,
    });
    if (existingMessage?.conversation_id) {
      conversationId = existingMessage.conversation_id;
    }
  }

  if (!conversationId) {
    const title = message.length > 40 ? `${message.slice(0, 40)}...` : message;
    const conversation = await ConversationRepository.create(user.id, title);
    conversationId = conversation.id;
  }

  await MessageRepository.create(conversationId, user.id, "user", message, {
    idempotencyKey,
  });

  const explicitMemory = extractExplicitMemory(message);
  try {
    if (explicitMemory) await saveExtractedMemory(user.id, explicitMemory);
  } catch (error) {
    if (explicitMemory) {
      return new Response(
        language === "es"
          ? "ALMA no pudo guardar ese recuerdo. Intentalo de nuevo."
          : "ALMA could not save that memory. Please try again.",
        { status: 503 },
      );
    }
    console.error("ALMA_MEMORY_SAVE_ERROR", {
      idempotencyKey,
      error: error instanceof Error ? error.message : "memory save failed",
    });
  }

  return createChatStreamResponse({
    userId: user.id,
    conversationId,
    message,
    language,
    idempotencyKey,
    mode,
  });
}
