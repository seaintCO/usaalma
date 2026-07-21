import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { OnboardingRepository } from "@/lib/db/repositories/onboarding/onboarding.repository";
import { WorkspaceRepository } from "@/lib/db/repositories/workspaces/workspace.repository";
import { DocumentRepository } from "@/lib/db/repositories/documents/document.repository";
import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.businessName) {
    return NextResponse.json(
      { error: "Missing businessName" },
      { status: 400 },
    );
  }

  const profile = await OnboardingRepository.save(user.id, body);

  await WorkspaceRepository.create(
    user.id,
    body.businessName,
    body.businessType ?? "business",
  );

  await DocumentRepository.create(
    user.id,
    `Perfil del negocio - ${body.businessName}`,
    `Negocio: ${body.businessName}
Tipo: ${body.businessType ?? "business"}
Meta principal: ${body.goal ?? "No especificada"}`,
    { embed: false },
  );

  await TaskRepository.create(
    user.id,
    `Configurar ALMA para ${body.businessName}`,
  );
  await TaskRepository.create(user.id, "Crear primera oferta");
  await TaskRepository.create(user.id, "Agregar primeros contactos al CRM");

  return NextResponse.json(profile);
}
