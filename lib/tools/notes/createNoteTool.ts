import { NoteRepository } from "@/lib/db/repositories/notes/note.repository";

export async function createNoteTool(userId:string, title:string, content:string) {
  const note = await NoteRepository.create(userId, title, content);

  return {
    success: true,
    message: `Nota creada: ${note.title}`,
    note,
  };
}
