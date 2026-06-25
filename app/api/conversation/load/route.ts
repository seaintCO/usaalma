import { NextResponse } from "next/server";
import { MessageRepository } from "@/lib/db/repositories/message.repository";

export async function POST(req:Request){

const body=await req.json();

const messages=

await MessageRepository.list(

body.conversationId

);

return NextResponse.json(

messages

);

}
