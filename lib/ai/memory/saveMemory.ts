import { MemoryRepository } from "@/lib/db/repositories/memory/memory.repository";
import { AgentService } from "@/lib/services/agents/agent.service";

export async function saveExtractedMemory(

userId:string,

data:any

){

for(const memory of data.memories){

await MemoryRepository.save(

userId,

memory.category,

memory.key,

memory.value,

memory.importance

);

try {
  await AgentService.mirrorMemory(
    userId,
    memory.category,
    memory.key,
    memory.value,
    memory.importance
  );
} catch {
  // The legacy memory path remains authoritative until the agent migration is applied.
}

}

}
