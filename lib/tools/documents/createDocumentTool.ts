import { DocumentRepository } from "@/lib/db/repositories/documents/document.repository";

export async function createDocumentTool(userId:string, title:string, content:string) {
  const document = await DocumentRepository.create(userId, title, content);

  return {
    success:true,
    message:`Documento guardado: ${document.title}`,
    document,
  };
}
