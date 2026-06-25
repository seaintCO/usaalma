import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConversationService } from "@/lib/services/conversation/conversation.service";

export async function POST(){

const user=await getCurrentUser();

if(!user){

return NextResponse.json({

error:"Unauthorized"

},{status:401});

}

const chat=await ConversationService.newChat(

user.id

);

return NextResponse.json(chat);

}
