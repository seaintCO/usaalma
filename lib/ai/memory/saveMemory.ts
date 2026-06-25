import { MemoryRepository } from "@/lib/db/repositories/memory/memory.repository";

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

}

}
