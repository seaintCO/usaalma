import { AgentActivityRepository } from "@/lib/db/repositories/agents/agentActivity.repository";

export async function recordAlmaActivity(input: Parameters<typeof AgentActivityRepository.create>[0]) {
  return AgentActivityRepository.create(input);
}
