import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { DocumentRepository } from "@/lib/db/repositories/documents/document.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  if (!body.title) return NextResponse.json({ error:"Missing title" }, { status:400 });

  const document = await DocumentRepository.create(
    user.id,
    body.title,
    body.content ?? ""
  );

  return NextResponse.json(document);
}

