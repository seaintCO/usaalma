import { WorkspaceRepository } from "@/lib/db/repositories/workspaces/workspace.repository";

export async function buildWorkspaceContext(userId:string) {
  const workspaces = await WorkspaceRepository.list(userId);

  if (!workspaces.length) {
    return "Sin workspaces todavía.";
  }

  return workspaces
    .map((w:any) => `- ${w.name} (${w.type})`)
    .join("\n");
}
