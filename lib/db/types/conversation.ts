export interface Conversation{

id:string;

userId:string;

title:string;

createdAt:string;

}

export interface Message{

id:string;

conversationId:string;

role:"user"|"assistant"|"system";

content:string;

createdAt:string;

}
