import { getRecentMemory, rememberEvent } from "@/lib/memory/almaMemory";
import { chooseAlmaModel } from "@/lib/alma/modelRouter";
import { planAlmaAction } from "@/lib/alma/brain";
import { getAlmaContext } from "@/lib/alma/context";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth/user";
import { buildContext } from "@/lib/ai/memory/context";
import { buildIntegrationContext } from "@/lib/ai/integrations/context";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { extractExplicitMemory, extractMemory } from "@/lib/ai/extractors/memoryExtractor";
import { saveExtractedMemory } from "@/lib/ai/memory/saveMemory";
import { executeTool, toolDefinitions } from "@/lib/ai/tools/registry";
import { safeJsonParse } from "@/lib/ai/tools/utils";
import { buildRelevantDocumentContext } from "@/lib/ai/documents/context";
import { buildWorkspaceContext } from "@/lib/ai/workspaces/context";
import { selectAgent } from "@/lib/ai/agents/selector";
import { almaSystemPrompt } from "@/lib/ai/prompts/almaSystemPrompt";
import { runPlannedExecution } from "@/lib/ai/planner/orchestrator";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { classifyAlmaRoute } from "@/lib/ai/router/classifyAlmaRoute";
import { buildMarketAnalysisPrompt } from "@/lib/ai/finance/marketPrompt";
import { AgentService } from "@/lib/services/agents/agent.service";
import { buildResponseLanguageInstruction } from "@/lib/alma/chat/chatExecutionHelpers";
import {
  completeChatRunTracking,
  processImageChatRun,
  resolveImageExecutionKind,
  startChatRunTracking,
  type ProcessImageChatRunInput,
} from "@/lib/alma/chat/processChatRun";

function createImageStreamResponse(input: ProcessImageChatRunInput) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`[CONVERSATION_ID:${input.conversationId}]\n`));
      try {
        await processImageChatRun({
          ...input,
          onProgress: async (event) => {
            if (event.type === "status") controller.enqueue(encoder.encode(event.message));
            if (event.type === "text_delta") controller.enqueue(encoder.encode(event.delta));
            if (event.type === "image") controller.enqueue(encoder.encode(event.content));
          },
        });
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

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return new Response("Unauthorized", { status:401 });

  let body: { message?: unknown; conversationId?: unknown; language?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON request body", { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  let conversationId = typeof body.conversationId === "string" ? body.conversationId : "";

  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const encoder = new TextEncoder();

    const demoReply = `Claro. Estoy en modo demo local. Puedo mostrarte cómo ALMA funcionará: chat en vivo, memoria, tareas, notas, CRM, facturación, documentos, workflows, marketplace y recepcionista IA. Cuando conectes Supabase, OpenAI y Stripe, estas acciones se guardarán y funcionarán en producción.`;

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[CONVERSATION_ID:demo-live]\n`));

        for (const word of demoReply.split(" ")) {
          controller.enqueue(encoder.encode(word + " "));
          await new Promise((resolve) => setTimeout(resolve, 25));
        }

        controller.close();
      }
    });

    return new Response(readable, {
      headers:{
        "Content-Type":"text/plain; charset=utf-8",
        "Cache-Control":"no-cache",
      },
    });
  }

  if (!message) return new Response("Mensaje vacío", { status:400 });

  let subscription;
  try {
    subscription = await SubscriptionRepository.get(user.id);
  } catch {
    return new Response("Subscription service is unavailable. Please try again shortly.", { status: 503 });
  }
  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return new Response("Tu suscripción no está activa. Ve a Billing para activar ALMA.", { status:402 });
  }
  if (!process.env.OPENAI_API_KEY) return new Response("Falta OPENAI_API_KEY", { status:500 });

  if (!conversationId) {
    const title = message.length > 40 ? message.slice(0, 40) + "..." : message;
    const conversation = await ConversationRepository.create(user.id, title);
    conversationId = conversation.id;
  }

  await MessageRepository.create(conversationId, user.id, "user", message);

  const explicitMemory = extractExplicitMemory(message);
  try {
    const extracted = explicitMemory ?? await extractMemory(message);
    await saveExtractedMemory(user.id, extracted);
  } catch (error) {
    if (explicitMemory) {
      const reply = body.language === "es" ? "ALMA no pudo guardar ese recuerdo. Inténtalo de nuevo." : "ALMA could not save that memory. Please try again.";
      return new Response(reply, { status: 503 });
    }
    console.error("ALMA_MEMORY_SAVE_ERROR", error);
  }

  const almaContext = await getAlmaContext(user.id, conversationId);
  const almaPlan = planAlmaAction(message, almaContext);
  const almaIntent = almaPlan.intent;

  if (resolveImageExecutionKind({ almaIntent })) {
    return createImageStreamResponse({
      userId: user.id,
      conversationId,
      userMessage: message,
      almaIntent,
      almaPlan,
      almaContext,
    });
  }

  const trackedExecution = await startChatRunTracking({
    userId: user.id,
    conversationId,
    intent: almaIntent,
    goal: message,
    plan: almaPlan,
  });

  let planned = null;
  try {
    planned = await runPlannedExecution(user.id, message);
  } catch (error) {
    console.error("ALMA_PLANNER_ERROR", error);
  }

  if (planned) {
    const encoder = new TextEncoder();

    const reply = `Listo. Creé un plan para: ${planned.goal}

Acciones ejecutadas:
${planned.steps.map((s:any, i:number) => `${i + 1}. ${s.label} — ${s.result?.message || "Completado"}`).join("\n")}`;

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[CONVERSATION_ID:${conversationId}]\n`));

        for (const word of reply.split(" ")) {
          controller.enqueue(encoder.encode(word + " "));
          await new Promise((resolve) => setTimeout(resolve, 15));
        }

        await MessageRepository.create(conversationId, user.id, "assistant", reply);
        await completeChatRunTracking({ tracked: trackedExecution, userId: user.id, success: true, summary: "ALMA completed a planned execution.", result: { intent: almaIntent, steps: planned.steps.length } });
        controller.close();
      }
    });

    return new Response(readable, {
      headers:{
        "Content-Type":"text/plain; charset=utf-8",
        "Cache-Control":"no-cache",
      },
    });
  }

  let detectedIntent = "chat" as Awaited<ReturnType<typeof classifyAlmaRoute>>;
  try {
    detectedIntent = await classifyAlmaRoute(message);
  } catch (error) {
    console.error("ALMA_ROUTER_ERROR", error);
  }

  if (detectedIntent === "finance_analysis") {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[CONVERSATION_ID:${conversationId}]\n`));
        controller.enqueue(encoder.encode("Preparing market analysis...\n\n"));

        try {
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const result:any = await client.responses.create({
            model: chooseAlmaModel(message || "", "auto"),
            input: buildMarketAnalysisPrompt("Chart / Market", message)
          });

          const reply = result.output_text || "No market analysis available.";
          await MessageRepository.create(conversationId, user.id, "assistant", reply);
          await completeChatRunTracking({ tracked: trackedExecution, userId: user.id, success: true, summary: "ALMA completed market analysis.", result: { route: detectedIntent } });
          controller.enqueue(encoder.encode(reply));
        } catch {
          const reply = "ALMA could not generate market analysis right now.";
          await MessageRepository.create(conversationId, user.id, "assistant", reply);
          await completeChatRunTracking({ tracked: trackedExecution, userId: user.id, success: false, summary: "ALMA market analysis failed.", error: reply });
          controller.enqueue(encoder.encode(reply));
        }

        controller.close();
      }
    });

    return new Response(readable, {
      headers:{
        "Content-Type":"text/plain; charset=utf-8",
        "Cache-Control":"no-cache",
      },
    });
  }
  if (resolveImageExecutionKind({ routeIntent: detectedIntent })) {
    return createImageStreamResponse({
      userId: user.id,
      conversationId,
      userMessage: message,
      almaIntent,
      almaPlan,
      almaContext,
      routeIntent: detectedIntent,
      tracking: trackedExecution,
    });
  }
  const memoryContext = await buildContext(user.id, message);
  const integrationContext = await buildIntegrationContext(user.id);
  const documentContext = await buildRelevantDocumentContext(user.id, message);
  const workspaceContext = await buildWorkspaceContext(user.id);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const selectedAgent = selectAgent(message);

  const systemPrompt = `
${selectedAgent.system}

Active Agent:
${selectedAgent.name}

Agent Description:
${selectedAgent.description}

You are ALMA, a personal and business assistant created by SEAINT.
Never say that you are ChatGPT.
Be clear, practical, elegant, and helpful.
${buildResponseLanguageInstruction(message, body.language)}

Puedes usar herramientas reales. Si el usuario pide crear, generar, dibujar, diseñar, visualizar, hacer una imagen, logo, foto, anuncio, producto visual o editar una imagen, usa la herramienta generate_image. No solo expliques; genera la imagen cuando sea claramente una petición visual.

Puedes usar herramientas reales para crear:
- tareas
- notas
- contactos CRM
- facturas

Si el usuario pide una acción, usa la herramienta correcta.

Integraciones conectadas:
${integrationContext}

Workspaces:
${workspaceContext}

Documentos guardados:
${documentContext}

Memoria del usuario:
${memoryContext || "Sin memoria guardada todavía."}
`;

  const firstResponse:any = await client.responses.create({
    model: chooseAlmaModel(message || "", "auto"),
    input: [
      { role:"system", content:systemPrompt },
      { role:"user", content:message }
    ],
    tools: toolDefinitions,
    tool_choice: "auto"
  });

  const toolCalls = (firstResponse.output || []).filter((item:any) => item.type === "function_call");

  const encoder = new TextEncoder();

  if (toolCalls.length) {
    const toolResults:any[] = [];

    for (const call of toolCalls) {
      const args = call.arguments ? safeJsonParse(call.arguments) : {};
      const result = await executeTool(user.id, call.name, args);

      toolResults.push({
        type:"function_call_output",
        call_id:call.call_id,
        output:JSON.stringify(result)
      });
      if (trackedExecution) {
        try {
          await AgentService.recordStep({ executionId: trackedExecution.executionId, sequence: toolResults.length + 1, kind: "tool", toolName: call.name, success: Boolean(result?.success), input: args, output: { success: Boolean(result?.success) }, error: result?.success ? null : result?.message || null });
        } catch {}
      }
    }

    const finalStream = await client.responses.create({
      model: chooseAlmaModel(message || "", "auto"),
      stream:true,
      input:[
        { role:"system", content:systemPrompt },
        { role:"user", content:message },
        ...toolCalls,
        ...toolResults
      ]
    });

    let fullReply = "";

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[CONVERSATION_ID:${conversationId}]\n`));

        try {
          for await (const event of finalStream as any) {
            if (event.type === "response.output_text.delta") {
              fullReply += event.delta;
              controller.enqueue(encoder.encode(event.delta));
            }
          }

          await MessageRepository.create(conversationId, user.id, "assistant", fullReply);
          await completeChatRunTracking({ tracked: trackedExecution, userId: user.id, success: true, summary: "ALMA completed a tool-assisted chat execution.", result: { toolCalls: toolCalls.length } });
        } catch {
          controller.enqueue(encoder.encode("\n\nALMA tuvo un error ejecutando la herramienta."));
          await completeChatRunTracking({ tracked: trackedExecution, userId: user.id, success: false, summary: "ALMA tool-assisted chat execution failed.", error: "Streaming tool response failed" });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers:{
        "Content-Type":"text/plain; charset=utf-8",
        "Cache-Control":"no-cache",
      },
    });
  }

  const stream = await client.responses.create({
    model: chooseAlmaModel(message || "", "auto"),
    stream:true,
    input:[
      { role:"system", content:systemPrompt },
      { role:"user", content:message }
    ]
  });

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
        await completeChatRunTracking({ tracked: trackedExecution, userId: user.id, success: true, summary: "ALMA completed a chat execution.", result: { route: "chat" } });
      } catch {
        controller.enqueue(encoder.encode("\n\nALMA tuvo un error generando la respuesta."));
        await completeChatRunTracking({ tracked: trackedExecution, userId: user.id, success: false, summary: "ALMA chat execution failed.", error: "Streaming response failed" });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers:{
      "Content-Type":"text/plain; charset=utf-8",
      "Cache-Control":"no-cache",
    },
  });
}























