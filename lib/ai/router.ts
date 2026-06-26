import OpenAI from "openai";
import { buildContext } from "@/lib/ai/memory/context";
import { extractMemory } from "@/lib/ai/extractors/memoryExtractor";
import { saveExtractedMemory } from "@/lib/ai/memory/saveMemory";
import { createTaskTool } from "@/lib/tools/tasks/createTaskTool";
import { createNoteTool } from "@/lib/tools/notes/createNoteTool";

export async function askALMA(data:{
  userId:string;
  message:string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return "ALMA está conectada, pero falta configurar OPENAI_API_KEY en .env.local.";
  }

  const lower = data.message.toLowerCase();

  if (
    lower.startsWith("agrega tarea") ||
    lower.startsWith("crear tarea") ||
    lower.startsWith("nueva tarea")
  ) {
    const title = data.message
      .replace(/agrega tarea:?/i, "")
      .replace(/crear tarea:?/i, "")
      .replace(/nueva tarea:?/i, "")
      .trim();

    if (title) {
      const result = await createTaskTool(data.userId, title);
      return result.message;
    }
  }

  if (
    lower.startsWith("agrega nota") ||
    lower.startsWith("crear nota") ||
    lower.startsWith("nueva nota")
  ) {
    const raw = data.message
      .replace(/agrega nota:?/i, "")
      .replace(/crear nota:?/i, "")
      .replace(/nueva nota:?/i, "")
      .trim();

    if (raw) {
      const title = raw.length > 40 ? raw.slice(0, 40) + "..." : raw;
      const result = await createNoteTool(data.userId, title, raw);
      return result.message;
    }
  }

  try {
    const extracted = await extractMemory(data.message);
    await saveExtractedMemory(data.userId, extracted);
  } catch {}

  const memoryContext = await buildContext(data.userId);

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model: "gpt-5.5",
    input: `
Eres ALMA, un asistente personal y empresarial creado por SEAINT.

Idioma principal: español.
Idioma secundario: inglés.
Nunca digas que eres ChatGPT.
Sé clara, práctica, elegante y útil.

Puedes crear acciones cuando el usuario escriba:
"Agrega tarea: [tarea]"
"Agrega nota: [nota]"

Memoria del usuario:
${memoryContext || "Sin memoria guardada todavía."}

Mensaje del usuario:
${data.message}
`
  });

  return response.output_text;
}
