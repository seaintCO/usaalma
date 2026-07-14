import OpenAI from "openai";
import { buildContext } from "@/lib/ai/memory/context";
import { extractMemory } from "@/lib/ai/extractors/memoryExtractor";
import { saveExtractedMemory } from "@/lib/ai/memory/saveMemory";
import { buildIntegrationContext } from "@/lib/ai/integrations/context";
import { executeTool, toolDefinitions } from "@/lib/ai/tools/registry";
import { safeJsonParse } from "@/lib/ai/tools/utils";

export async function askALMA(data:{ userId:string; message:string }) {
  if (!process.env.OPENAI_API_KEY) {
    return "ALMA está conectada, pero falta configurar OPENAI_API_KEY en .env.local.";
  }

  try {
    const extracted = await extractMemory(data.message);
    await saveExtractedMemory(data.userId, extracted);
  } catch {
    // Memory extraction should never break the chat.
  }

  const memoryContext = await buildContext(data.userId);
  const integrationContext = await buildIntegrationContext(data.userId);

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const model = process.env.ALMA_MODEL || "gpt-4.1";

  const systemPrompt = `
Eres ALMA, un asistente personal y empresarial creado por SEAINT.

Idioma principal: español.
Idioma secundario: inglés.
Nunca digas que eres ChatGPT.
Sé clara, práctica, elegante y útil.

Puedes usar herramientas reales para crear:
- Tareas
- Notas
- Contactos CRM
- Facturas

Si el usuario pide una acción, usa la herramienta correcta.

Integraciones conectadas:
${integrationContext}

Memoria del usuario:
${memoryContext || "Sin memoria guardada todavía."}
`;

  const firstResponse:any = await client.responses.create({
    model,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: data.message }
    ],
    tools: toolDefinitions,
    tool_choice: "auto"
  });

  const toolCalls = (firstResponse.output || []).filter((item:any) => item.type === "function_call");

  if (!toolCalls.length) {
    return firstResponse.output_text || "No pude responder.";
  }

  const toolResults:any[] = [];

  for (const call of toolCalls) {
    const args = call.arguments ? safeJsonParse(call.arguments) : {};
    const result = await executeTool(data.userId, call.name, args);

    toolResults.push({
      type: "function_call_output",
      call_id: call.call_id,
      output: JSON.stringify(result)
    });
  }

  const finalResponse:any = await client.responses.create({
    model,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: data.message },
      ...toolCalls,
      ...toolResults
    ]
  });

  return finalResponse.output_text || "Listo.";
}

