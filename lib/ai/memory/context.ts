import { AgentMemoryRepository } from "@/lib/db/repositories/agents/agentMemory.repository";
import { MemoryService } from "@/lib/services/memory/memory.service";

type Memory = { memory_key: string; memory_value: string; importance?: number | null };

export async function buildContext(userId: string, query = "") {
  const legacy = await MemoryService.load(userId);
  let agent: Memory[] = [];
  try {
    agent = await AgentMemoryRepository.listForUser(userId);
  } catch {
    // Keep existing users functional until the Phase 1 migration is applied.
  }
  const unique = new Map<string, Memory>();
  for (const memory of [...agent, ...legacy]) unique.set(`${memory.memory_key}:${memory.memory_value}`, memory);
  const terms = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const relevance = (memory: Memory) => (memory.importance ?? 5) + terms.reduce((score, term) => score + (memory.memory_key.toLowerCase().includes(term) || memory.memory_value.toLowerCase().includes(term) ? 10 : 0), 0);
  return [...unique.values()]
    .sort((left, right) => relevance(right) - relevance(left))
    .slice(0, 20)
    .map((memory) => `${memory.memory_key}: ${memory.memory_value}`)
    .join("\n");
}
