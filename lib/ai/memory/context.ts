import { MemoryService } from "@/lib/services/memory/memory.service";

export async function buildContext(

userId:string

){

const memories=

await MemoryService.load(userId);

let text="";

for(const m of memories){

text+=`${m.memory_key}: ${m.memory_value}\n`;

}

return text;

}
