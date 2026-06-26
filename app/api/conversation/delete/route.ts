import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.conversationId) {
    return NextResponse.json({ error:"Missing conversationId" }, { status:400 });
  }

  await ConversationRepository.delete(body.conversationId);

  return NextResponse.json({ success:true });
}
