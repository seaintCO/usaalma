import OpenAI from "openai";
import { buildContext } from "@/lib/ai/memory/context";
import { extractMemory } from "@/lib/ai/extractors/memoryExtractor";
import { saveExtractedMemory } from "@/lib/ai/memory/saveMemory";
import { createTaskTool } from "@/lib/tools/tasks/createTaskTool";
import { createNoteTool } from "@/lib/tools/notes/createNoteTool";
import { createContactTool } from "@/lib/tools/crm/createContactTool";
import { createInvoiceTool } from "@/lib/tools/invoices/createInvoiceTool";
import { buildIntegrationContext } from "@/lib/ai/integrations/context";

export async function askALMA(data:{ userId:string; message:string }) {
  if (!process.env.OPENAI_API_KEY) {
    return "ALMA está conectada, pero falta configurar OPENAI_API_KEY en .env.local.";
  }

  const lower = data.message.toLowerCase();

  if (lower.startsWith("agrega tarea") || lower.startsWith("crear tarea") || lower.startsWith("nueva tarea")) {
    const title = data.message.replace(/agrega tarea:?/i, "").replace(/crear tarea:?/i, "").replace(/nueva tarea:?/i, "").trim();
    if (title) return (await createTaskTool(data.userId, title)).message;
  }

  if (lower.startsWith("agrega nota") || lower.startsWith("crear nota") || lower.startsWith("nueva nota")) {
    const raw = data.message.replace(/agrega nota:?/i, "").replace(/crear nota:?/i, "").replace(/nueva nota:?/i, "").trim();
    if (raw) return (await createNoteTool(data.userId, raw.slice(0, 40), raw)).message;
  }

  if (lower.startsWith("agrega contacto") || lower.startsWith("crear contacto") || lower.startsWith("nuevo contacto")) {
    const raw = data.message.replace(/agrega contacto:?/i, "").replace(/crear contacto:?/i, "").replace(/nuevo contacto:?/i, "").trim();

    if (raw) {
      const parts = raw.split(",").map((p) => p.trim());
      const name = parts[0];
      const company = parts[1] ?? "";
      const email = parts.find((p) => p.includes("@")) ?? "";
      const phone = parts.find((p) => /\d{7,}/.test(p.replace(/\D/g, ""))) ?? "";

      return (await createContactTool(data.userId, name, company, email, phone)).message;
    }
  }

  if (lower.startsWith("agrega factura") || lower.startsWith("crear factura") || lower.startsWith("nueva factura")) {
    const raw = data.message.replace(/agrega factura:?/i, "").replace(/crear factura:?/i, "").replace(/nueva factura:?/i, "").trim();

    if (raw) {
      const parts = raw.split(",").map((p) => p.trim());
      const clientName = parts[0];
      const amountText = parts.find((p) => /\d/.test(p)) ?? "0";
      const amount = Number(amountText.replace(/[^0-9.]/g, "") || 0);

      return (await createInvoiceTool(data.userId, clientName, amount)).message;
    }
  }

  try {
    const extracted = await extractMemory(data.message);
    await saveExtractedMemory(data.userId, extracted);
  } catch {}

  const memoryContext = await buildContext(data.userId);
  const integrationContext = await buildIntegrationContext(data.userId);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: "gpt-5.5",
    input: `
Eres ALMA, un asistente personal y empresarial creado por SEAINT.

Idioma principal: español.
Idioma secundario: inglés.
Nunca digas que eres ChatGPT.

Puedes crear acciones con:
"Agrega tarea: [tarea]"
"Agrega nota: [nota]"
"Agrega contacto: [nombre], [empresa], [email], [teléfono]"
"Agrega factura: [cliente], [monto]"

Integraciones conectadas:
${integrationContext}

Memoria:
${memoryContext || "Sin memoria guardada todavía."}

Usuario:
${data.message}
`
  });

  return response.output_text;
}

