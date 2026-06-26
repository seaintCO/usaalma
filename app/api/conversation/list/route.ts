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

if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
  return NextResponse.json([
    { id:"demo-1", title:"Bienvenido a ALMA", created_at:new Date().toISOString() },
    { id:"demo-2", title:"Demo: crear factura", created_at:new Date().toISOString() },
    { id:"demo-3", title:"Demo: recepcionista IA", created_at:new Date().toISOString() },
  ]);
}

const history=await ConversationService.history(user.id);

return NextResponse.json(history);

}

