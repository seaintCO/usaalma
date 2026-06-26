import { createClient } from "@/lib/supabase/server";
import { createEmbedding } from "@/lib/ai/embeddings/createEmbedding";

export class DocumentRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, title:string, content:string) {
    const supabase = await createClient();

    const embedding = await createEmbedding(`${title}\n${content}`);

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id:userId,
        title,
        content,
        source_type:"manual",
        embedding,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}

