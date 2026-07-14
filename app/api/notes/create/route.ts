import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { NoteRepository } from "@/lib/db/repositories/notes/note.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  if (!body.title) return NextResponse.json({ error:"Missing title" }, { status:400 });

  const note = await NoteRepository.create(user.id, { title: body.title, content: body.content ?? "", source: "manual" });

  return NextResponse.json(note);
}

