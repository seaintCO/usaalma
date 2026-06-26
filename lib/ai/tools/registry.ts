import { createTaskTool } from "@/lib/tools/tasks/createTaskTool";
import { createNoteTool } from "@/lib/tools/notes/createNoteTool";
import { createContactTool } from "@/lib/tools/crm/createContactTool";
import { createInvoiceTool } from "@/lib/tools/invoices/createInvoiceTool";
import { createReceptionistTool } from "@/lib/tools/receptionist/createReceptionistTool";
import { createDocumentTool } from "@/lib/tools/documents/createDocumentTool";
import { createWorkspaceTool } from "@/lib/tools/workspaces/createWorkspaceTool";
import { createWorkflowTool } from "@/lib/tools/workflows/createWorkflowTool";
import { cleanNumber, cleanString } from "./utils";
import { ToolRunRepository } from "@/lib/db/repositories/tools/toolRun.repository";
import { getInstalledModuleKeys, userHasModule } from "@/lib/ai/modules/permissions";

export const toolDefinitions = [
  { type:"function", name:"create_task", description:"Crear una tarea.", parameters:{ type:"object", properties:{ title:{ type:"string" } }, required:["title"], additionalProperties:false } },
  { type:"function", name:"create_note", description:"Crear una nota.", parameters:{ type:"object", properties:{ title:{ type:"string" }, content:{ type:"string" } }, required:["title","content"], additionalProperties:false } },
  { type:"function", name:"create_contact", description:"Crear contacto CRM.", parameters:{ type:"object", properties:{ name:{ type:"string" }, company:{ type:"string" }, email:{ type:"string" }, phone:{ type:"string" } }, required:["name"], additionalProperties:false } },
  { type:"function", name:"create_invoice", description:"Crear factura.", parameters:{ type:"object", properties:{ clientName:{ type:"string" }, amount:{ type:"number" } }, required:["clientName","amount"], additionalProperties:false } },
  { type:"function", name:"create_receptionist", description:"Crear recepcionista IA.", parameters:{ type:"object", properties:{ businessName:{ type:"string" }, businessType:{ type:"string" }, phoneNumber:{ type:"string" }, greeting:{ type:"string" } }, required:["businessName"], additionalProperties:false } },
  { type:"function", name:"create_document", description:"Guardar documento o conocimiento.", parameters:{ type:"object", properties:{ title:{ type:"string" }, content:{ type:"string" } }, required:["title","content"], additionalProperties:false } },
  { type:"function", name:"create_workspace", description:"Crear workspace.", parameters:{ type:"object", properties:{ name:{ type:"string" }, type:{ type:"string" } }, required:["name"], additionalProperties:false } },
  { type:"function", name:"create_workflow", description:"Crear workflow de automatización.", parameters:{ type:"object", properties:{ name:{ type:"string" } }, required:["name"], additionalProperties:false } }
] as any[];

async function logAndReturn(userId:string, name:string, args:any, result:any) {
  await ToolRunRepository.create(userId, name, args, result);
  return result;
}

function blocked(moduleName:string) {
  return { success:false, message:`Este módulo no está instalado todavía. Instala ${moduleName} desde Marketplace.` };
}

export async function executeTool(userId:string, name:string, args:any) {
  try {
    const installed = await getInstalledModuleKeys(userId);

    if (name === "create_task") {
      if (!userHasModule(installed, "tasks")) return blocked("Tasks");
      const title = cleanString(args.title);
      if (!title) return { success:false, message:"Falta el título de la tarea." };
      return await logAndReturn(userId, name, args, await createTaskTool(userId, title));
    }

    if (name === "create_note") {
      if (!userHasModule(installed, "notes")) return blocked("Notes");
      const title = cleanString(args.title);
      const content = cleanString(args.content);
      if (!title) return { success:false, message:"Falta el título de la nota." };
      return await logAndReturn(userId, name, args, await createNoteTool(userId, title, content));
    }

    if (name === "create_contact") {
      if (!userHasModule(installed, "crm")) return blocked("CRM");
      const contactName = cleanString(args.name);
      if (!contactName) return { success:false, message:"Falta el nombre del contacto." };
      return await logAndReturn(userId, name, args, await createContactTool(userId, contactName, cleanString(args.company), cleanString(args.email), cleanString(args.phone)));
    }

    if (name === "create_invoice") {
      if (!userHasModule(installed, "invoicing")) return blocked("Facturación");
      const clientName = cleanString(args.clientName);
      const amount = cleanNumber(args.amount);
      if (!clientName) return { success:false, message:"Falta el nombre del cliente." };
      if (amount <= 0) return { success:false, message:"Falta un monto válido." };
      return await logAndReturn(userId, name, args, await createInvoiceTool(userId, clientName, amount));
    }

    if (name === "create_receptionist") {
      if (!userHasModule(installed, "ai_receptionist")) return blocked("Recepcionista IA");
      const businessName = cleanString(args.businessName);
      if (!businessName) return { success:false, message:"Falta el nombre del negocio." };
      return await logAndReturn(userId, name, args, await createReceptionistTool(userId, businessName, cleanString(args.businessType), cleanString(args.phoneNumber), cleanString(args.greeting)));
    }

    if (name === "create_document") {
      if (!userHasModule(installed, "documents")) return blocked("Documentos");
      const title = cleanString(args.title);
      const content = cleanString(args.content);
      if (!title) return { success:false, message:"Falta el título del documento." };
      return await logAndReturn(userId, name, args, await createDocumentTool(userId, title, content));
    }

    if (name === "create_workspace") {
      const workspaceName = cleanString(args.name);
      if (!workspaceName) return { success:false, message:"Falta el nombre del workspace." };
      return await logAndReturn(userId, name, args, await createWorkspaceTool(userId, workspaceName, cleanString(args.type) || "business"));
    }

    if (name === "create_workflow") {
      const workflowName = cleanString(args.name);
      if (!workflowName) return { success:false, message:"Falta el nombre del workflow." };
      return await logAndReturn(userId, name, args, await createWorkflowTool(userId, workflowName));
    }

    return { success:false, message:`Herramienta no encontrada: ${name}` };
  } catch {
    return { success:false, message:"La herramienta falló al ejecutarse." };
  }
}
