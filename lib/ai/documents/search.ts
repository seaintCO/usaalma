import { createClient } from "@/lib/supabase/server";
import { createEmbedding } from "@/lib/ai/embeddings/createEmbedding";

export async function searchDocuments(userId:string, query:string) {
  const embedding = await createEmbedding(query);

  if (!embedding) return [];

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_user_id: userId,
    match_count: 5,
  });

  if (error) return [];

  return data ?? [];
}
