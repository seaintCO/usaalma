import { MemoryRepository } from "@/lib/db/repositories/memory/memory.repository";
import { AgentService } from "@/lib/services/agents/agent.service";

type ExtractedMemory = { category: string; key: string; value: string; importance: number };

export async function saveExtractedMemory(userId: string, data: { memories?: ExtractedMemory[] }) {
  const memories = data.memories ?? [];
  for (const memory of memories) {
    // Canonical agent memory must succeed before ALMA can confirm a save.
    await AgentService.mirrorMemory(userId, memory.category, memory.key, memory.value, memory.importance);
    await MemoryRepository.save(userId, memory.category, memory.key, memory.value, memory.importance);
  }
  return memories.length;
}
