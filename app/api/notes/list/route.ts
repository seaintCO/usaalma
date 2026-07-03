import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { NoteRepository } from "@/lib/db/repositories/notes/note.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const notes = await NoteRepository.list(user.id);

  return NextResponse.json(notes);
}
