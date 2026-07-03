import { WorkspaceRepository } from "@/lib/db/repositories/workspaces/workspace.repository";

export async function createWorkspaceTool(userId:string, name:string, type:string = "business") {
  const workspace = await WorkspaceRepository.create(userId, name, type);

  return {
    success:true,
    message:`Workspace creado: ${workspace.name}`,
    workspace,
  };
}
