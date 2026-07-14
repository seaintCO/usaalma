import { createClient } from "@/lib/supabase/server";
import { redactExecutionData, redactExecutionText } from "@/lib/alma/security/redactExecutionData";

export class AgentApprovalRepository {
  static async create(input: { agentId: string; executionId: string; userId: string; actionSummary: string; toolName?: string; argumentsRedacted?: Record<string, unknown> }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_approvals").insert({
      agent_id: input.agentId, execution_id: input.executionId, user_id: input.userId,
      action_summary: redactExecutionText(input.actionSummary) || "[REDACTED]", tool_name: input.toolName ?? null, arguments_redacted: redactExecutionData(input.argumentsRedacted ?? {}),
    }).select().single();
    if (error) throw error;
    return data;
  }
}
