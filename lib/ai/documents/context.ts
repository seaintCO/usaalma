import { DocumentRepository } from "@/lib/db/repositories/documents/document.repository";

export async function buildDocumentContext(userId:string) {
  const documents = await DocumentRepository.list(userId);

  if (!documents.length) {
    return "Sin documentos guardados todavía.";
  }

  return documents
    .slice(0, 5)
    .map((doc:any) => `Documento: ${doc.title}\n${doc.content}`)
    .join("\n\n---\n\n");
}
