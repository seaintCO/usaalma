import { createTaskTool } from "@/lib/tools/tasks/createTaskTool";
import { createNoteTool } from "@/lib/tools/notes/createNoteTool";
import { createContactTool } from "@/lib/tools/crm/createContactTool";
import { createInvoiceTool } from "@/lib/tools/invoices/createInvoiceTool";

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

export async function executeTool(userId:string, name:string, args:any) {
  if (name === "create_task") {
    return await createTaskTool(userId, args.title);
  }

  if (name === "create_note") {
    return await createNoteTool(userId, args.title, args.content);
  }

  if (name === "create_contact") {
    return await createContactTool(userId, args.name, args.company, args.email, args.phone);
  }

  if (name === "create_invoice") {
    return await createInvoiceTool(userId, args.clientName, Number(args.amount));
  }

  return {
    success:false,
    message:`Herramienta no encontrada: ${name}`
  };
}
