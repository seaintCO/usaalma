import { planAlmaAction, detectImageSize, buildImageFollowupPrompt } from "@/lib/alma/brain";
import { getAlmaContext, upsertAlmaContext, logAlmaExecution } from "@/lib/alma/context";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth/user";
import { buildContext } from "@/lib/ai/memory/context";
import { buildIntegrationContext } from "@/lib/ai/integrations/context";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { extractMemory } from "@/lib/ai/extractors/memoryExtractor";
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
import { generateImageTool } from "@/lib/tools/images/generateImageTool";
import { buildMarketAnalysisPrompt } from "@/lib/ai/finance/marketPrompt";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return new Response("Unauthorized", { status:401 });

  const body = await req.json();
  const message = body.message;
  let conversationId = body.conversationId;

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

  const subscription = await SubscriptionRepository.get(user.id);
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

  try {
    const extracted = await extractMemory(message);
    await saveExtractedMemory(user.id, extracted);
  } catch {}


      const almaContext = await getAlmaContext(user.id, conversationId);
  const almaPlan = planAlmaAction(message, almaContext);
  const almaIntent = almaPlan.intent;

  const imagePrompt =
    almaIntent === "image_followup"
      ? buildImageFollowupPrompt(message, almaContext)
      : message;

  const imageSize = detectImageSize(message);

  if (almaIntent === "image_generation" || almaIntent === "image_followup") {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[CONVERSATION_ID:${conversationId}]\n`));

        try {
                    const result:any = await generateImageTool(user.id, imagePrompt, imageSize);

          await upsertAlmaContext(user.id, conversationId, {
            last_intent: almaIntent,
            last_image_prompt: imagePrompt,
            last_image_size: imageSize,
            last_prompt: message,
            metadata: {
              tool: "creative",
              mode: almaIntent
            }
          });

          await logAlmaExecution({
            userId: user.id,
            conversationId,
            userMessage: message,
            intent: almaIntent,
            plan: { ...almaPlan, imagePrompt, imageSize },
            toolUsed: "generateImageTool",
            result: { success: result?.success },
            success: !!result?.success
          });

          if (result?.success && result?.image?.outputBase64) {
            const reply = `[ALMA_IMAGE:${result.image.outputBase64}]`;
            await MessageRepository.create(conversationId, user.id, "assistant", reply);
            controller.enqueue(encoder.encode(reply));
          } else {
            const reply = result?.message || result?.error || "No se pudo generar la imagen.";
            await MessageRepository.create(conversationId, user.id, "assistant", reply);
            controller.enqueue(encoder.encode(reply));
          }
        } catch (err:any) {
          console.error("ALMA_IMAGE_ERROR", err);
          const reply = `ALMA tuvo un error generando la imagen: ${err?.message || "error desconocido"}`;
          await MessageRepository.create(conversationId, user.id, "assistant", reply);
          controller.enqueue(encoder.encode(reply));
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

  const planned = await runPlannedExecution(user.id, message);

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

  const detectedIntent = await classifyAlmaRoute(message);

  if (detectedIntent === "finance_analysis") {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[CONVERSATION_ID:${conversationId}]\n`));
        controller.enqueue(encoder.encode("Preparing market analysis...\n\n"));

        try {
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const result:any = await client.responses.create({
            model: process.env.ALMA_MODEL || "gpt-5.5",
            input: buildMarketAnalysisPrompt("Chart / Market", message)
          });

          const reply = result.output_text || "No market analysis available.";
          await MessageRepository.create(conversationId, user.id, "assistant", reply);
          controller.enqueue(encoder.encode(reply));
        } catch {
          const reply = "ALMA could not generate market analysis right now.";
          await MessageRepository.create(conversationId, user.id, "assistant", reply);
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
  if (detectedIntent === "image_generate") {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[CONVERSATION_ID:${conversationId}]\n`));
        controller.enqueue(encoder.encode("Generando imagen premium...\n\n"));

        try {
          const result:any = await generateImageTool(user.id, message);

          if (result?.success && result?.image?.outputBase64) {
            const reply = `[ALMA_IMAGE:${result.image.outputBase64}]`;
            await MessageRepository.create(conversationId, user.id, "assistant", reply);
            controller.enqueue(encoder.encode(reply));
          } else {
            const reply = result?.message || "No se pudo generar la imagen.";
            await MessageRepository.create(conversationId, user.id, "assistant", reply);
            controller.enqueue(encoder.encode(reply));
          }
        } catch {
          const reply = "ALMA tuvo un error generando la imagen.";
          await MessageRepository.create(conversationId, user.id, "assistant", reply);
          controller.enqueue(encoder.encode(reply));
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

  if (detectedIntent === "image_edit") {
    const reply = "Sube la imagen que quieres editar o dime cuál imagen de tu galería quieres cambiar. Luego puedo hacer cambios como fondo, estilo, color, realismo, formato 16:9 o 9:16.";
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[CONVERSATION_ID:${conversationId}]\n`));
        controller.enqueue(encoder.encode(reply));
        await MessageRepository.create(conversationId, user.id, "assistant", reply);
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
  const memoryContext = await buildContext(user.id);
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

Eres ALMA, un asistente personal y empresarial creado por SEAINT.

Idioma principal: español.
Idioma secundario: inglés.
Nunca digas que eres ChatGPT.
Sé clara, práctica, elegante y útil.

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
    model: process.env.ALMA_MODEL || "gpt-5.5",
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
    }

    const finalStream = await client.responses.create({
      model: process.env.ALMA_MODEL || "gpt-5.5",
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
        } catch {
          controller.enqueue(encoder.encode("\n\nALMA tuvo un error ejecutando la herramienta."));
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
    model: process.env.ALMA_MODEL || "gpt-5.5",
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
      } catch {
        controller.enqueue(encoder.encode("\n\nALMA tuvo un error generando la respuesta."));
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






















