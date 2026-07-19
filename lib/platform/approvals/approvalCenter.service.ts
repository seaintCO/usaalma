import { createClient } from "@/lib/supabase/server";
import { ActionApprovalRepository } from "./repository";
import type { ActionApprovalRecord, ActionApprovalStatus } from "./types";
import { getActionExecutor } from "@/lib/platform/actions/actionExecutorRegistry";
import { getProtectedActionDefinition } from "@/lib/platform/actions/protectedActions";

export type UnifiedApprovalKind = "action" | "agent";

export type UnifiedApprovalRecord = {
  id: string;
  kind: UnifiedApprovalKind;
  status: ActionApprovalStatus;
  sourceStatus: string;
  actionKey: string | null;
  actionSummary: string;
  requestedBy: string;
  workspaceId: string | null;
  agentId: string | null;
  executionId: string | null;
  requestedPayload: Record<string, unknown>;
  approvedPayload: Record<string, unknown> | null;
  resultPayload: Record<string, unknown> | null;
  errorMessage: string | null;
  requestedAt: string | null;
  updatedAt: string | null;
  editable: boolean;
  executable: boolean;
  audit: Array<Record<string, unknown>>;
};

type LegacyAgentApprovalRow = {
  id: string;
  status: string;
  action_summary: string;
  tool_name: string | null;
  arguments_redacted: Record<string, unknown> | null;
  requested_at: string | null;
  resolved_at: string | null;
  user_id: string;
  agent_id: string | null;
  execution_id: string | null;
};

function mapLegacyStatus(status: string): ActionApprovalStatus {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "expired") return "failed";
  return "awaiting_approval";
}

function mapActionApproval(
  approval: ActionApprovalRecord,
  audit: Array<Record<string, unknown>>,
): UnifiedApprovalRecord {
  const executor = getActionExecutor(approval.action_key);
  const actionDefinition = getProtectedActionDefinition(approval.action_key);
  return {
    id: approval.id,
    kind: "action",
    status: approval.status,
    sourceStatus: approval.status,
    actionKey: approval.action_key,
    actionSummary:
      approval.action_summary || actionDefinition?.name || "Action",
    requestedBy: approval.agent_id ? "ALMA Agent" : "ALMA",
    workspaceId: approval.workspace_id,
    agentId: approval.agent_id,
    executionId: approval.execution_id,
    requestedPayload: approval.requested_payload,
    approvedPayload: approval.approved_payload,
    resultPayload: approval.result_payload,
    errorMessage: approval.error_message,
    requestedAt: approval.requested_at ?? approval.proposed_at,
    updatedAt: approval.updated_at,
    editable: executor?.editable === true,
    executable: Boolean(
      executor &&
      (approval.status === "awaiting_approval" ||
        approval.status === "approved"),
    ),
    audit,
  };
}

function mapLegacyApproval(row: LegacyAgentApprovalRow): UnifiedApprovalRecord {
  return {
    id: row.id,
    kind: "agent",
    status: mapLegacyStatus(row.status),
    sourceStatus: row.status,
    actionKey: row.tool_name,
    actionSummary: row.action_summary,
    requestedBy: "Agent Builder",
    workspaceId: null,
    agentId: row.agent_id,
    executionId: row.execution_id,
    requestedPayload: row.arguments_redacted ?? {},
    approvedPayload: null,
    resultPayload: null,
    errorMessage: null,
    requestedAt: row.requested_at,
    updatedAt: row.resolved_at ?? row.requested_at,
    editable: false,
    executable: false,
    audit: [],
  };
}

export class ApprovalCenterService {
  static async listForUser(userId: string, limit = 80) {
    const supabase = await createClient();
    const [actionApprovals, legacyApprovals] = await Promise.all([
      ActionApprovalRepository.listForUser(userId, limit),
      supabase
        .from("agent_approvals")
        .select(
          "id,status,action_summary,tool_name,arguments_redacted,requested_at,resolved_at,user_id,agent_id,execution_id",
        )
        .eq("user_id", userId)
        .order("requested_at", { ascending: false })
        .limit(limit),
    ]);

    if (legacyApprovals.error) throw legacyApprovals.error;

    const actionItems = await Promise.all(
      actionApprovals.map(async (approval) =>
        mapActionApproval(
          approval,
          await ActionApprovalRepository.listAuditEventsForUser(
            userId,
            approval.id,
          ),
        ),
      ),
    );
    const legacyItems = (
      (legacyApprovals.data ?? []) as LegacyAgentApprovalRow[]
    ).map(mapLegacyApproval);

    return [...actionItems, ...legacyItems].sort((a, b) =>
      String(b.requestedAt ?? "").localeCompare(String(a.requestedAt ?? "")),
    );
  }
}
