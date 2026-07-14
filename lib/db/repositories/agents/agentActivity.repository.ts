import { createClient } from "@/lib/supabase/server";
import type { AgentActivityLevel } from "@/lib/alma/types";
import { redactExecutionData, redactExecutionText } from "@/lib/alma/security/redactExecutionData";

export class AgentActivityRepository {
  static async create(input: { agentId: string; userId: string; executionId?: string | null; level?: AgentActivityLevel; eventType: string; summary: string; metadata?: Record<string, unknown> }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_activity_logs").insert({
      agent_id: input.agentId, user_id: input.userId, execution_id: input.executionId ?? null,
      level: input.level ?? "info", event_type: input.eventType, summary: redactExecutionText(input.summary) || "[REDACTED]", metadata: redactExecutionData(input.metadata ?? {}),
    }).select().single();
    if (error) throw error;
    return data;
  }
}
