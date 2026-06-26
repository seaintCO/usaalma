import { createTaskTool } from "@/lib/tools/tasks/createTaskTool";
import { createNoteTool } from "@/lib/tools/notes/createNoteTool";
import { createContactTool } from "@/lib/tools/crm/createContactTool";
import { createInvoiceTool } from "@/lib/tools/invoices/createInvoiceTool";
import { cleanNumber, cleanString } from "./utils";
import { ToolRunRepository } from "@/lib/db/repositories/tools/toolRun.repository";

export const toolDefinitions = [
  {
    type: "function",
    name: "create_task",
    description: "Crear una tarea para el usuario.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título de la tarea" }
      },
      required: ["title"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "create_note",
    description: "Crear una nota para el usuario.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" }
      },
      required: ["title", "content"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "create_contact",
    description: "Crear un contacto en el CRM.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" }
      },
      required: ["name"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "create_invoice",
    description: "Crear una factura para un cliente.",
    parameters: {
      type: "object",
      properties: {
        clientName: { type: "string" },
        amount: { type: "number" }
      },
      required: ["clientName", "amount"],
      additionalProperties: false
    }
  }
] as any[];

async function logAndReturn(userId:string, name:string, args:any, result:any) {
  await ToolRunRepository.create(userId, name, args, result);
  return result;
}

export async function executeTool(userId:string, name:string, args:any) {
  try {
    if (name === "create_task") {
      const title = cleanString(args.title);
      if (!title) return { success:false, message:"Falta el título de la tarea." };

      const result = await createTaskTool(userId, title);
      return await logAndReturn(userId, name, args, result);
    }

    if (name === "create_note") {
      const title = cleanString(args.title);
      const content = cleanString(args.content);
      if (!title) return { success:false, message:"Falta el título de la nota." };

      const result = await createNoteTool(userId, title, content);
      return await logAndReturn(userId, name, args, result);
    }

    if (name === "create_contact") {
      const contactName = cleanString(args.name);
      if (!contactName) return { success:false, message:"Falta el nombre del contacto." };

      const result = await createContactTool(
        userId,
        contactName,
        cleanString(args.company),
        cleanString(args.email),
        cleanString(args.phone)
      );

      return await logAndReturn(userId, name, args, result);
    }

    if (name === "create_invoice") {
      const clientName = cleanString(args.clientName);
      const amount = cleanNumber(args.amount);

      if (!clientName) return { success:false, message:"Falta el nombre del cliente." };
      if (amount <= 0) return { success:false, message:"Falta un monto válido." };

      const result = await createInvoiceTool(userId, clientName, amount);
      return await logAndReturn(userId, name, args, result);
    }

    return {
      success:false,
      message:`Herramienta no encontrada: ${name}`
    };
  } catch {
    return {
      success:false,
      message:"La herramienta falló al ejecutarse."
    };
  }
}
