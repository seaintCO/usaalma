import { createTaskTool } from "@/lib/tools/tasks/createTaskTool";
import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";
import { NoteRepository } from "@/lib/db/repositories/notes/note.repository";
import { createNoteTool } from "@/lib/tools/notes/createNoteTool";
import { crmTool, invoiceTool } from "@/lib/tools/business/businessTools";
import { createReceptionistTool } from "@/lib/tools/receptionist/createReceptionistTool";
import { createDocumentTool } from "@/lib/tools/documents/createDocumentTool";
import { createWorkspaceTool } from "@/lib/tools/workspaces/createWorkspaceTool";
import { createWorkflowTool } from "@/lib/tools/workflows/createWorkflowTool";
import { addWorkflowStepTool, runWorkflowTool } from "@/lib/tools/workflows/workflowActionsTool";
import { generateImageTool } from "@/lib/tools/images/generateImageTool";
import { summarizeGmailTool, draftGmailTool, sendGmailTool } from "@/lib/tools/gmail/gmailTools";
import { cleanNumber, cleanString } from "./utils";
import { ToolRunRepository } from "@/lib/db/repositories/tools/toolRun.repository";
import { getInstalledModuleKeys, userHasModule } from "@/lib/ai/modules/permissions";

export const toolDefinitions = [
  { type:"function", name:"create_task", description:"Crear una tarea.", parameters:{ type:"object", properties:{ title:{ type:"string" }, description:{type:"string"}, priority:{type:"string",enum:["low","medium","high","urgent"]}, dueAt:{type:"string"} }, required:["title"], additionalProperties:false } },
  { type:"function", name:"list_tasks", description:"Mostrar tareas reales del usuario.", parameters:{type:"object",properties:{status:{type:"string",enum:["open","completed","overdue","today","all"]}},additionalProperties:false}},
  { type:"function", name:"update_task_status", description:"Completar, reabrir o cancelar una sola tarea por título exacto.", parameters:{type:"object",properties:{title:{type:"string"},status:{type:"string",enum:["completed","open","cancelled"]}},required:["title","status"],additionalProperties:false}},
  { type:"function", name:"create_note", description:"Crear una nota.", parameters:{ type:"object", properties:{ title:{ type:"string" }, content:{ type:"string" } }, required:["title","content"], additionalProperties:false } },
  { type:"function", name:"list_notes", description:"Mostrar notas reales del usuario.", parameters:{type:"object",properties:{query:{type:"string"}},additionalProperties:false}},
  { type:"function", name:"update_note", description:"Actualizar una sola nota por título exacto.", parameters:{type:"object",properties:{title:{type:"string"},content:{type:"string"}},required:["title","content"],additionalProperties:false}},
  { type:"function", name:"delete_note", description:"Eliminar una sola nota por título exacto.", parameters:{type:"object",properties:{title:{type:"string"}},required:["title"],additionalProperties:false}},
  { type:"function", name:"get_note", description:"Cargar una nota real por título exacto para resumirla o responder preguntas.", parameters:{type:"object",properties:{title:{type:"string"}},required:["title"],additionalProperties:false}},
  { type:"function", name:"create_contact", description:"Crear contacto CRM.", parameters:{ type:"object", properties:{ name:{ type:"string" }, company:{ type:"string" }, email:{ type:"string" }, phone:{ type:"string" } }, required:["name"], additionalProperties:false } },
  { type:"function", name:"create_company", description:"Create an owned CRM company.", parameters:{type:"object",properties:{name:{type:"string"},website:{type:"string"}},required:["name"],additionalProperties:false}},
  { type:"function", name:"create_opportunity", description:"Create an owned CRM opportunity.", parameters:{type:"object",properties:{title:{type:"string"},stage:{type:"string"},value:{type:"number"}},required:["title"],additionalProperties:false}},
  { type:"function", name:"list_crm", description:"List owned CRM contacts, companies and opportunities.", parameters:{type:"object",properties:{},additionalProperties:false}},
  { type:"function", name:"update_opportunity_stage", description:"Move an owned opportunity to a pipeline stage.", parameters:{type:"object",properties:{id:{type:"string"},stage:{type:"string"}},required:["id","stage"],additionalProperties:false}},
  { type:"function", name:"create_crm_activity", description:"Record an owned CRM note or activity.", parameters:{type:"object",properties:{content:{type:"string"},type:{type:"string"},opportunityId:{type:"string"},contactId:{type:"string"},companyId:{type:"string"}},required:["content"],additionalProperties:false}},
  { type:"function", name:"create_crm_follow_up", description:"Create an owned CRM follow-up task.", parameters:{type:"object",properties:{title:{type:"string"},description:{type:"string"},dueAt:{type:"string"}},required:["title"],additionalProperties:false}},
  { type:"function", name:"create_invoice", description:"Crear factura.", parameters:{ type:"object", properties:{ clientName:{ type:"string" }, amount:{ type:"number" } }, required:["clientName","amount"], additionalProperties:false } },
  { type:"function", name:"add_invoice_item", description:"Add a line item to an exact owned draft invoice number.", parameters:{type:"object",properties:{invoiceNumber:{type:"string"},description:{type:"string"},quantity:{type:"number"},unitPrice:{type:"number"}},required:["invoiceNumber","description"],additionalProperties:false}},
  { type:"function", name:"update_invoice_item", description:"Update a line item on an exact owned draft invoice number.", parameters:{type:"object",properties:{invoiceNumber:{type:"string"},itemId:{type:"string"},description:{type:"string"},quantity:{type:"number"},unitPrice:{type:"number"}},required:["invoiceNumber","itemId","description"],additionalProperties:false}},
  { type:"function", name:"set_invoice_amounts", description:"Set tax, discount, or due date for an exact owned draft invoice.", parameters:{type:"object",properties:{invoiceNumber:{type:"string"},taxRate:{type:"number"},discountRate:{type:"number"},dueDate:{type:"string"}},required:["invoiceNumber"],additionalProperties:false}},
  { type:"function", name:"list_unpaid_invoices", description:"List owned unpaid invoices.", parameters:{type:"object",properties:{},additionalProperties:false}},
  { type:"function", name:"get_invoice", description:"Retrieve an owned invoice by exact invoice number.", parameters:{type:"object",properties:{invoiceNumber:{type:"string"}},required:["invoiceNumber"],additionalProperties:false}},
  { type:"function", name:"mark_invoice_paid", description:"Mark an exact owned invoice paid.", parameters:{type:"object",properties:{invoiceNumber:{type:"string"}},required:["invoiceNumber"],additionalProperties:false}},
  { type:"function", name:"cancel_invoice", description:"Cancel an exact owned invoice.", parameters:{type:"object",properties:{invoiceNumber:{type:"string"}},required:["invoiceNumber"],additionalProperties:false}},
  { type:"function", name:"duplicate_invoice", description:"Duplicate an exact owned invoice as a draft.", parameters:{type:"object",properties:{invoiceNumber:{type:"string"}},required:["invoiceNumber"],additionalProperties:false}},
  { type:"function", name:"create_receptionist", description:"Crear recepcionista IA.", parameters:{ type:"object", properties:{ businessName:{ type:"string" }, businessType:{ type:"string" }, phoneNumber:{ type:"string" }, greeting:{ type:"string" } }, required:["businessName"], additionalProperties:false } },
  { type:"function", name:"create_document", description:"Guardar documento o conocimiento.", parameters:{ type:"object", properties:{ title:{ type:"string" }, content:{ type:"string" } }, required:["title","content"], additionalProperties:false } },
  { type:"function", name:"create_workspace", description:"Crear workspace.", parameters:{ type:"object", properties:{ name:{ type:"string" }, type:{ type:"string" } }, required:["name"], additionalProperties:false } },
  { type:"function", name:"create_workflow", description:"Crear workflow de automatización.", parameters:{ type:"object", properties:{ name:{ type:"string" } }, required:["name"], additionalProperties:false } },
  { type:"function", name:"add_workflow_step", description:"Agregar paso a un workflow.", parameters:{ type:"object", properties:{ workflowId:{ type:"string" }, label:{ type:"string" }, type:{ type:"string" } }, required:["workflowId","label"], additionalProperties:false } },
  { type:"function", name:"run_workflow", description:"Ejecutar workflow.", parameters:{ type:"object", properties:{ workflowId:{ type:"string" } }, required:["workflowId"], additionalProperties:false } },
  { type:"function", name:"generate_image", description:"Generar una imagen usando IA.", parameters:{ type:"object", properties:{ prompt:{ type:"string" } }, required:["prompt"], additionalProperties:false } },
  { type:"function", name:"summarize_gmail", description:"Leer y resumir Gmail del usuario.", parameters:{ type:"object", properties:{ query:{ type:"string" } }, required:[], additionalProperties:false } },
  { type:"function", name:"draft_gmail", description:"Crear un borrador en Gmail.", parameters:{ type:"object", properties:{ to:{ type:"string" }, subject:{ type:"string" }, body:{ type:"string" } }, required:["to","subject","body"], additionalProperties:false } },
  { type:"function", name:"send_gmail", description:"Enviar un email desde Gmail.", parameters:{ type:"object", properties:{ to:{ type:"string" }, subject:{ type:"string" }, body:{ type:"string" } }, required:["to","subject","body"], additionalProperties:false } }
] as any[];

async function logAndReturn(userId:string, name:string, args:any, result:any) {
  await ToolRunRepository.create(userId, name, args, result);
  return result;
}

function blocked(moduleName:string) {
  return { success:false, message:`Este módulo no está instalado todavía. Instala ${moduleName} desde Marketplace.` };
}

export async function executeTool(userId:string, name:string, args:any, context?:{executionId?:string}) {
  try {
    const installed = await getInstalledModuleKeys(userId);

    if (name === "create_task") {
      if (!userHasModule(installed, "tasks")) return blocked("Tasks");
      const title = cleanString(args.title);
      if (!title) return { success:false, message:"Falta el título de la tarea." };
      return await logAndReturn(userId, name, args, await createTaskTool(userId, { title, description:cleanString(args.description)||undefined, priority:["low","medium","high","urgent"].includes(args.priority)?args.priority:undefined, dueAt:cleanString(args.dueAt)||undefined, sourceExecutionId:context?.executionId }));
    }
    if (name === "list_tasks") {
      if (!userHasModule(installed, "tasks")) return blocked("Tasks");
      const tasks = await TaskRepository.list(userId, { status:["open","completed","overdue","today","all"].includes(args.status) ? args.status : "open" });
      return { success:true, message:tasks.length ? tasks.map((task:any)=>`${task.title} (${task.status})`).join("\n") : "No tasks found.", tasks };
    }
    if (name === "update_task_status") {
      if (!userHasModule(installed, "tasks")) return blocked("Tasks");
      const title=cleanString(args.title); const status=cleanString(args.status);
      const matches=title ? await TaskRepository.findExactTitle(userId,title) : [];
      if (matches.length !== 1) return { success:false, message:matches.length ? "More than one task matches. Please clarify the exact task." : "No matching task was found." };
      const task=await TaskRepository.update(userId,matches[0].id,{status:status==="completed"||status==="cancelled"?status:"open"});
      return { success:true, message:`Task ${task.status}: ${task.title}`, task };
    }

    if (name === "create_note") {
      if (!userHasModule(installed, "notes")) return blocked("Notes");
      const title = cleanString(args.title);
      const content = cleanString(args.content);
      if (!title) return { success:false, message:"Falta el título de la nota." };
      return await logAndReturn(userId, name, args, await createNoteTool(userId, title, content, context?.executionId));
    }
    if (name === "list_notes") { if (!userHasModule(installed, "notes")) return blocked("Notes"); const notes=await NoteRepository.list(userId,{query:cleanString(args.query)||undefined}); return {success:true,message:notes.length?notes.map((note:any)=>note.title).join("\n"):"No notes found.",notes}; }
    if (name === "update_note" || name === "delete_note") { if (!userHasModule(installed, "notes")) return blocked("Notes"); const title=cleanString(args.title); const matches=title?await NoteRepository.findExactTitle(userId,title):[]; if(matches.length!==1)return {success:false,message:matches.length?"More than one note matches. Please clarify the exact note.":"No matching note was found."}; if(name==="delete_note"){await NoteRepository.delete(userId,matches[0].id);return {success:true,message:`Note deleted: ${matches[0].title}`};} const note=await NoteRepository.update(userId,matches[0].id,{content:cleanString(args.content)});return {success:true,message:`Note updated: ${note.title}`,note}; }
    if (name === "get_note") { if (!userHasModule(installed, "notes")) return blocked("Notes"); const title=cleanString(args.title); const matches=title?await NoteRepository.findExactTitle(userId,title):[]; if(matches.length!==1)return {success:false,message:matches.length?"More than one note matches. Please clarify the exact note.":"No matching note was found."}; return {success:true,message:`Note content for ${matches[0].title}: ${matches[0].content}`,note:matches[0]}; }

    if (name === "create_contact") {
      if (!userHasModule(installed, "crm")) return blocked("CRM");
      const contactName = cleanString(args.name);
      if (!contactName) return { success:false, message:"Falta el nombre del contacto." };
      return await logAndReturn(userId, name, args, await crmTool(userId, "create_contact", { name: contactName, company: cleanString(args.company), email: cleanString(args.email), phone: cleanString(args.phone) }, context?.executionId));
    }

    if (["create_company","create_opportunity","list_crm","update_opportunity_stage","create_crm_activity"].includes(name)) {
      if (!userHasModule(installed, "crm")) return blocked("CRM");
      return await logAndReturn(userId, name, args, await crmTool(userId, name, args, context?.executionId));
    }
    if (name === "create_crm_follow_up") { if (!userHasModule(installed, "crm") || !userHasModule(installed, "tasks")) return blocked("CRM"); const title=cleanString(args.title); if(!title)return {success:false,message:"Missing follow-up title."}; return await logAndReturn(userId,name,args,await createTaskTool(userId,{title,description:cleanString(args.description)||undefined,dueAt:cleanString(args.dueAt)||undefined,sourceExecutionId:context?.executionId})); }

    if (name === "create_invoice") {
      if (!userHasModule(installed, "invoicing")) return blocked("Facturación");
      const clientName = cleanString(args.clientName);
      const amount = cleanNumber(args.amount);
      if (!clientName) return { success:false, message:"Falta el nombre del cliente." };
      if (amount <= 0) return { success:false, message:"Falta un monto válido." };
      return await logAndReturn(userId, name, args, await invoiceTool(userId, "create_invoice", { clientName, amount }, context?.executionId));
    }

    if (["add_invoice_item","update_invoice_item","set_invoice_amounts","list_unpaid_invoices","get_invoice","mark_invoice_paid","cancel_invoice","duplicate_invoice"].includes(name)) {
      if (!userHasModule(installed, "invoicing")) return blocked("Facturación");
      return await logAndReturn(userId, name, args, await invoiceTool(userId, name, args, context?.executionId));
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

    if (name === "add_workflow_step") {
      const workflowId = cleanString(args.workflowId);
      const label = cleanString(args.label);
      if (!workflowId) return { success:false, message:"Falta el ID del workflow." };
      if (!label) return { success:false, message:"Falta el nombre del paso." };
      return await logAndReturn(userId, name, args, await addWorkflowStepTool(userId, workflowId, label, cleanString(args.type) || "task"));
    }

    if (name === "run_workflow") {
      const workflowId = cleanString(args.workflowId);
      if (!workflowId) return { success:false, message:"Falta el ID del workflow." };
      return await logAndReturn(userId, name, args, await runWorkflowTool(userId, workflowId));
    }

    if (name === "generate_image") {
      if (!userHasModule(installed, "image_generator")) return blocked("Image Generator");
      const prompt = cleanString(args.prompt);
      if (!prompt) return { success:false, message:"Falta el prompt de la imagen." };
      return await logAndReturn(userId, name, args, await generateImageTool(userId, prompt));
    }

    if (name === "summarize_gmail") {
      return await logAndReturn(userId, name, args, await summarizeGmailTool(userId, cleanString(args.query) || "in:inbox newer_than:7d"));
    }

    if (name === "draft_gmail") {
      const to = cleanString(args.to);
      const subject = cleanString(args.subject);
      const body = cleanString(args.body);
      if (!to || !subject || !body) return { success:false, message:"Faltan campos para crear el borrador." };
      return await logAndReturn(userId, name, args, await draftGmailTool(userId, to, subject, body));
    }

    if (name === "send_gmail") {
      const to = cleanString(args.to);
      const subject = cleanString(args.subject);
      const body = cleanString(args.body);
      if (!to || !subject || !body) return { success:false, message:"Faltan campos para enviar el correo." };
      return await logAndReturn(userId, name, args, await sendGmailTool(userId, to, subject, body));
    }

    return { success:false, message:`Herramienta no encontrada: ${name}` };
  } catch {
    return { success:false, message:"La herramienta falló al ejecutarse. Si es Gmail, reconecta Gmail en Settings." };
  }
}
