import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { DocumentRepository } from "@/lib/db/repositories/documents/document.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const documents = await DocumentRepository.list(user.id);

  return NextResponse.json(documents);
}
