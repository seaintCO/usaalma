import { createClient } from "@/lib/supabase/server";

export class AgentMemoryRepository {
  static async save(input: { agentId: string; userId: string; category: string; key: string; value: string; importance?: number }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_memories").upsert({
      agent_id: input.agentId, user_id: input.userId, category: input.category,
      memory_key: input.key, memory_value: input.value, importance: input.importance ?? 5,
    }, { onConflict: "agent_id,memory_key" }).select().single();
    if (error) throw error;
    return data;
  }

  static async listForUser(userId: string, limit = 50) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_memories")
      .select("category,memory_key,memory_value,importance,updated_at")
      .eq("user_id", userId)
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }
}
