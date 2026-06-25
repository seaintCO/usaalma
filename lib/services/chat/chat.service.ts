import { MessageRepository } from "@/lib/db/repositories/message.repository";

export class ChatService{

static async saveUser(

conversationId:string,

userId:string,

message:string

){

await MessageRepository.create(

conversationId,

userId,

"user",

message

);

}

static async saveAssistant(

conversationId:string,

userId:string,

message:string

){

await MessageRepository.create(

conversationId,

userId,

"assistant",

message

);

}

}
