import { createClient } from "@/lib/supabase/server";

export class AgentTaskRepository {
  static async create(input: { agentId: string; userId: string; title: string; instructions?: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_tasks").insert({
      agent_id: input.agentId, user_id: input.userId, title: input.title, instructions: input.instructions ?? "",
    }).select().single();
    if (error) throw error;
    return data;
  }
}
