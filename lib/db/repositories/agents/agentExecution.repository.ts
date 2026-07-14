import { createClient } from "@/lib/supabase/server";
import type { AgentExecutionInput, AgentExecutionStatus, AgentStepKind, AgentStepStatus } from "@/lib/alma/types";
import { redactExecutionData, redactExecutionText } from "@/lib/alma/security/redactExecutionData";

export class AgentExecutionRepository {
  static async findForDurableRun(input: { id: string; userId: string; agentId: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_executions")
      .select("id,agent_id,user_id,status,result,error,conversation_id,intent,plan,completed_at")
      .eq("id", input.id).eq("user_id", input.userId).eq("agent_id", input.agentId).maybeSingle();
    if (error) throw error;
    return data;
  }

  static async claimPending(id: string, userId: string, agentId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_executions")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", userId).eq("agent_id", agentId).eq("status", "pending")
      .select("id,agent_id,status,result,error").maybeSingle();
    if (error) throw error;
    return data;
  }
  static async create(input: AgentExecutionInput) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_executions").insert({
      agent_id: input.agentId, user_id: input.userId, conversation_id: input.conversationId ?? null,
      trigger_type: input.triggerType, intent: input.intent ?? null, goal: redactExecutionText(input.goal), plan: redactExecutionData(input.plan ?? {}), status: "running",
    }).select().single();
    if (error) throw error;
    return data;
  }

  static async complete(id: string, status: Extract<AgentExecutionStatus, "completed" | "failed" | "cancelled">, result: Record<string, unknown> = {}, error?: string | null) {
    const supabase = await createClient();
    const { data, error: updateError } = await supabase
      .from("agent_executions")
      .update({ status, result: redactExecutionData(result), error: redactExecutionText(error), completed_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["pending", "running", "waiting_approval"])
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!data) throw new Error("Execution is not available for completion.");
  }

  static async addStep(input: { executionId: string; sequence: number; kind: AgentStepKind; status?: AgentStepStatus; toolName?: string; input?: Record<string, unknown>; output?: Record<string, unknown>; error?: string | null }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_execution_steps").insert({
      execution_id: input.executionId, sequence: input.sequence, kind: input.kind, status: input.status ?? "completed",
      tool_name: input.toolName ?? null, input: redactExecutionData(input.input ?? {}), output: redactExecutionData(input.output ?? {}), error: redactExecutionText(input.error),
      started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data;
  }

  static async claimStep(input: { executionId: string; sequence: number; kind: AgentStepKind; toolName?: string; input?: Record<string, unknown> }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_execution_steps").insert({
      execution_id: input.executionId, sequence: input.sequence, kind: input.kind, status: "running",
      tool_name: input.toolName ?? null, input: redactExecutionData(input.input ?? {}), output: {}, started_at: new Date().toISOString(),
    }).select().maybeSingle();
    if (!error && data) return { claimed: true as const, step: data };
    const { data: existing, error: existingError } = await supabase.from("agent_execution_steps")
      .select("*").eq("execution_id", input.executionId).eq("sequence", input.sequence).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { claimed: false as const, step: existing };
    throw error;
  }

  static async finishStep(id: string, status: Extract<AgentStepStatus, "completed" | "failed" | "skipped">, output: Record<string, unknown> = {}, error?: string | null) {
    const supabase = await createClient();
    const { data, error: updateError } = await supabase.from("agent_execution_steps")
      .update({ status, output: redactExecutionData(output), error: redactExecutionText(error), completed_at: new Date().toISOString() })
      .eq("id", id).in("status", ["pending", "running"]).select().maybeSingle();
    if (updateError) throw updateError;
    if (!data) throw new Error("Execution step is not available for completion.");
    return data;
  }
}
