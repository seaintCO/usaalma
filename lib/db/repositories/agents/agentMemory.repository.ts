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
}
