import { MemoryService } from "@/lib/services/memory/memory.service";

export async function buildMemoryPrompt(

userId:string

){

const memories=

await MemoryService.load(userId);

let prompt="";

for(const memory of memories){

prompt+=`${memory.memory_key}: ${memory.memory_value}\n`;

}

return prompt;

}
