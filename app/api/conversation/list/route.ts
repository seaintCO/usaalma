import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConversationService } from "@/lib/services/conversation/conversation.service";

export async function GET(){

const user=await getCurrentUser();

if(!user){

return NextResponse.json({

error:"Unauthorized"

},{status:401});

}

const history=await ConversationService.history(

user.id

);

return NextResponse.json(history);

}
