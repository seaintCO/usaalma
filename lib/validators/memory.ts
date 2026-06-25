import { MemoryExtraction } from "../ai/schemas/memory";

export function validateMemory(data:any):MemoryExtraction{

if(!data.memories){

return{

memories:[]

};

}

return data;

}
