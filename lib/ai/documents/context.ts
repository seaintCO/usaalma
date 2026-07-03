import { searchDocuments } from "@/lib/ai/documents/search";

export async function buildRelevantDocumentContext(userId:string, query:string) {
  const results = await searchDocuments(userId, query);

  if (!results.length) {
    return "No se encontraron documentos relevantes.";
  }

  return results
    .map((doc:any) => `Documento: ${doc.title}\nRelevancia: ${Math.round((doc.similarity ?? 0) * 100)}%\n${doc.content}`)
    .join("\n\n---\n\n");
}
