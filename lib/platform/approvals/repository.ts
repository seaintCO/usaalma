import { redactExecutionData } from "@/lib/alma/security/redactExecutionData";
import { createClient } from "@/lib/supabase/server";
import type { ActionApprovalRecord, ActionApprovalStatus } from "./types";

export type CreateActionApprovalInput = {
  userId: string;
  workspaceId?: string | null;
  agentId?: string | null;
  executionId?: string | null;
  domain: string;
  actionKey: string;
  actionSummary: string;
  status: ActionApprovalStatus;
  riskLevel: ActionApprovalRecord["risk_level"];
  approvalPolicy: ActionApprovalRecord["approval_policy"];
  requestedPayload?: Record<string, unknown>;
};

export type TransitionActionApprovalInput = {
  userId: string;
  approvalId: string;
  status: ActionApprovalStatus;
  actorUserId?: string | null;
  approvedPayload?: Record<string, unknown> | null;
  resultPayload?: Record<string, unknown> | null;
  errorMessage?: string | null;
};

function statusTimestampColumn(status: ActionApprovalStatus) {
  return {
    awaiting_approval: "requested_at",
    approved: "approved_at",
    rejected: "rejected_at",
    executing: "executing_at",
    completed: "completed_at",
    failed: "failed_at",
    proposed: "proposed_at",
  }[status];
}

export class ActionApprovalRepository {
  static async create(input: CreateActionApprovalInput) {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const timestampColumn = statusTimestampColumn(input.status);
    const { data, error } = await supabase
      .from("action_approvals")
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId ?? null,
        agent_id: input.agentId ?? null,
        execution_id: input.executionId ?? null,
        domain: input.domain,
        action_key: input.actionKey,
        action_summary: input.actionSummary,
        status: input.status,
        risk_level: input.riskLevel,
        approval_policy: input.approvalPolicy,
        requested_payload: redactExecutionData(input.requestedPayload ?? {}),
        ...(timestampColumn ? { [timestampColumn]: now } : {}),
      })
      .select()
      .single();

    if (error) throw error;
    return data as ActionApprovalRecord;
  }

  static async getForUser(userId: string, approvalId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("action_approvals")
      .select("*")
      .eq("id", approvalId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as ActionApprovalRecord | null) ?? null;
  }

  static async listForUser(userId: string, limit = 50) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("action_approvals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as ActionApprovalRecord[];
  }

  static async listAuditEventsForUser(userId: string, approvalId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("action_audit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("approval_id", approvalId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  static async transition(input: TransitionActionApprovalInput) {
    const supabase = await createClient();
    const timestampColumn = statusTimestampColumn(input.status);
    const patch: Record<string, unknown> = {
      status: input.status,
      updated_at: new Date().toISOString(),
      ...(timestampColumn
        ? { [timestampColumn]: new Date().toISOString() }
        : {}),
    };

    if (input.status === "approved") {
      patch.approved_by = input.actorUserId ?? input.userId;
      patch.approved_payload = redactExecutionData(input.approvedPayload ?? {});
    }
    if (input.status === "rejected") {
      patch.rejected_by = input.actorUserId ?? input.userId;
    }
    if (input.resultPayload) {
      patch.result_payload = redactExecutionData(input.resultPayload);
    }
    if (input.errorMessage) {
      patch.error_message = input.errorMessage;
    }

    const { data, error } = await supabase
      .from("action_approvals")
      .update(patch)
      .eq("id", input.approvalId)
      .eq("user_id", input.userId)
      .select()
      .single();

    if (error) throw error;
    return data as ActionApprovalRecord;
  }

  static async createAuditEvent(input: {
    userId: string;
    workspaceId?: string | null;
    approvalId?: string | null;
    agentId?: string | null;
    executionId?: string | null;
    actionKey: string;
    eventType: string;
    riskLevel: ActionApprovalRecord["risk_level"];
    payload?: Record<string, unknown>;
  }) {
    const supabase = await createClient();
    const { error } = await supabase.from("action_audit_logs").insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      approval_id: input.approvalId ?? null,
      agent_id: input.agentId ?? null,
      execution_id: input.executionId ?? null,
      action_key: input.actionKey,
      event_type: input.eventType,
      risk_level: input.riskLevel,
      payload_redacted: redactExecutionData(input.payload ?? {}),
    });

    if (error) throw error;
  }
}
