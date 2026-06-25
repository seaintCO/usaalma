import { MemoryRepository } from "@/lib/db/repositories/memory/memory.repository";

export class MemoryService{

static async load(userId:string){

return await MemoryRepository.all(userId);

}

static async remember(

userId:string,

category:string,

key:string,

value:string,

importance:number=5

){

await MemoryRepository.save(

userId,

category,

key,

value,

importance

);

}

}
