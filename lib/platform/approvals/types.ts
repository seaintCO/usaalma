import type {
  AlmaActionRisk,
  AlmaApprovalPolicy,
} from "@/lib/platform/modules/registry";

export const ACTION_APPROVAL_STATUSES = [
  "proposed",
  "awaiting_approval",
  "approved",
  "rejected",
  "executing",
  "completed",
  "failed",
] as const;

export type ActionApprovalStatus = (typeof ACTION_APPROVAL_STATUSES)[number];

export type ActionApprovalRecord = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  agent_id: string | null;
  execution_id: string | null;
  domain: string;
  action_key: string;
  action_summary: string;
  status: ActionApprovalStatus;
  risk_level: AlmaActionRisk;
  approval_policy: AlmaApprovalPolicy;
  requested_payload: Record<string, unknown>;
  approved_payload: Record<string, unknown> | null;
  result_payload: Record<string, unknown> | null;
  error_message: string | null;
  proposed_at: string;
  requested_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  executing_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  created_at: string;
  updated_at: string;
};

export const ACTION_APPROVAL_TERMINAL_STATUSES: readonly ActionApprovalStatus[] =
  ["rejected", "completed", "failed"];

export const ACTION_APPROVAL_TRANSITIONS: Record<
  ActionApprovalStatus,
  readonly ActionApprovalStatus[]
> = {
  proposed: ["awaiting_approval", "approved", "rejected"],
  awaiting_approval: ["approved", "rejected"],
  approved: ["executing", "rejected"],
  rejected: [],
  executing: ["completed", "failed"],
  completed: [],
  failed: [],
};

export function isActionApprovalStatus(
  status: string,
): status is ActionApprovalStatus {
  return ACTION_APPROVAL_STATUSES.includes(status as ActionApprovalStatus);
}

export function canTransitionActionApproval(
  from: ActionApprovalStatus,
  to: ActionApprovalStatus,
) {
  return ACTION_APPROVAL_TRANSITIONS[from].includes(to);
}
