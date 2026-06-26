import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.json([
      { module_key:"tasks", name:"Tasks", price:"Incluido", description:"Organiza pendientes.", installed:true },
      { module_key:"notes", name:"Notes", price:"Incluido", description:"Guarda ideas y contexto.", installed:true },
      { module_key:"crm", name:"CRM", price:"Business Pro", description:"Gestiona clientes.", installed:true },
      { module_key:"invoicing", name:"Facturación", price:"Business Pro", description:"Crea facturas.", installed:true },
      { module_key:"documents", name:"Documentos", price:"Incluido", description:"Base de conocimiento.", installed:true },
      { module_key:"ai_receptionist", name:"Recepcionista IA", price:"+ $99/mes", description:"Contesta llamadas.", installed:true }
    ]);
  }

  const modules = await ModuleRepository.list(user.id);

  return NextResponse.json(modules);
}

