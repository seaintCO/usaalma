import { createClient } from "@/lib/supabase/server";
import type { AgentPermissionEffect } from "@/lib/alma/types";

export class AgentPermissionRepository {
  static async list(agentId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_permissions").select("*").eq("agent_id", agentId).order("created_at");
    if (error) throw error;
    return data ?? [];
  }

  static async create(input: { agentId: string; userId: string; action: string; effect: AgentPermissionEffect; toolName?: string; connectionId?: string; resourceScope?: string; conditions?: Record<string, unknown> }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_permissions").insert({
      agent_id: input.agentId, user_id: input.userId, action: input.action, effect: input.effect,
      tool_name: input.toolName ?? null, connection_id: input.connectionId ?? null, resource_scope: input.resourceScope ?? null, conditions: input.conditions ?? {},
    }).select().single();
    if (error) throw error;
    return data;
  }
}
