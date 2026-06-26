import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { DocumentRepository } from "@/lib/db/repositories/documents/document.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.title) return NextResponse.json({ error:"Missing title" }, { status:400 });

  const document = await DocumentRepository.create(
    user.id,
    body.title,
    body.content ?? ""
  );

  return NextResponse.json(document);
}
