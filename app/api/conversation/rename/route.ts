import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.conversationId || !body.title) {
    return NextResponse.json({ error:"Missing fields" }, { status:400 });
  }

  await ConversationRepository.rename(body.conversationId, body.title);

  return NextResponse.json({ success:true });
}
