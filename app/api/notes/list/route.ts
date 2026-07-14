import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { NoteRepository } from "@/lib/db/repositories/notes/note.repository";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { searchParams } = new URL(request.url);
  const notes = await NoteRepository.list(user.id, { query: searchParams.get("q") || undefined, archived: searchParams.get("archived") === "true" });

  return NextResponse.json(notes);
}
