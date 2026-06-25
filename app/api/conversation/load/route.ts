import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { MessageRepository } from "@/lib/db/repositories/message.repository";

export async function POST(req:Request){

const user=await getCurrentUser();

if(!user){
  return NextResponse.json({error:"Unauthorized"},{status:401});
}

const body=await req.json();

if(!body.conversationId){
  return NextResponse.json({error:"Missing conversationId"},{status:400});
}

const messages=await MessageRepository.list(body.conversationId);

const cleanMessages=messages.map((m:any)=>({
  role:m.role,
  content:m.content
}));

return NextResponse.json(cleanMessages);

}
