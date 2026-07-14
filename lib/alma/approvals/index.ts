import { AgentApprovalRepository } from "@/lib/db/repositories/agents/agentApproval.repository";

export async function requestAlmaApproval(input: Parameters<typeof AgentApprovalRepository.create>[0]) {
  return AgentApprovalRepository.create(input);
}
