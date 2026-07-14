import { NoteRepository } from "@/lib/db/repositories/notes/note.repository";

export async function createNoteTool(userId:string, title:string, content:string, sourceExecutionId?:string) {
  const note = await NoteRepository.createForChat(userId, { title, content, source:"alma_chat", sourceExecutionId });

  return {
    success: true,
    message: `Nota creada: ${note.title}`,
    note,
  };
}
