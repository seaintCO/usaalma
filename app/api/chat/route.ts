import { NextResponse } from "next/server";
import { askALMA } from "@/lib/ai/router";
import { getCurrentUser } from "@/lib/auth/user";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { MessageRepository } from "@/lib/db/repositories/message.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  }

  const body = await req.json();
  const message = body.message;
  let conversationId = body.conversationId;

  if (!message) {
    return NextResponse.json({ error:"Mensaje vacío" }, { status:400 });
  }

  if (!conversationId) {
    const title = message.length > 40 ? message.slice(0, 40) + "..." : message;
    const conversation = await ConversationRepository.create(user.id, title);
    conversationId = conversation.id;
  }

  await MessageRepository.create(conversationId, user.id, "user", message);

  const reply = await askALMA({
    userId:user.id,
    message
  });

  await MessageRepository.create(conversationId, user.id, "assistant", reply);

  await ConversationRepository.rename(
    conversationId,
    message.length > 40 ? message.slice(0, 40) + "..." : message
  );

  return NextResponse.json({
    reply,
    conversationId
  });
}
