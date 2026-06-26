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
import { runPlannedExecution } from "@/lib/ai/planner/orchestrator";

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






