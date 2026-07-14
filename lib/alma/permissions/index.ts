import { AgentPermissionRepository } from "@/lib/db/repositories/agents/agentPermission.repository";

export async function listAlmaPermissions(agentId: string) {
  return AgentPermissionRepository.list(agentId);
}
