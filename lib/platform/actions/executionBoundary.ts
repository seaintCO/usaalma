import { ActionApprovalRepository } from "@/lib/platform/approvals/repository";
import type { ActionApprovalRecord } from "@/lib/platform/approvals/types";
import { transitionActionApproval } from "@/lib/platform/approvals/service";
import { getActionExecutor } from "./actionExecutorRegistry";
import type {
  AlmaActionRisk,
  AlmaApprovalPolicy,
} from "@/lib/platform/modules/registry";

export class ActionApprovalRequiredError extends Error {
  constructor(
    message: string,
    public readonly approvalId: string,
  ) {
    super(message);
    this.name = "ActionApprovalRequiredError";
  }
}

export type AuditedActionInput = {
  userId: string;
  workspaceId?: string | null;
  agentId?: string | null;
  executionId?: string | null;
  domain: string;
  actionKey: string;
  actionSummary: string;
  riskLevel: AlmaActionRisk;
  approvalPolicy: AlmaApprovalPolicy;
  requestedPayload?: Record<string, unknown>;
};

export type AuditedActionDecision =
  | {
      canExecute: true;
      status: "approved";
      approval: null;
    }
  | {
      canExecute: false;
      status: "awaiting_approval";
      approval: ActionApprovalRecord;
    };

function requiresApproval(
  riskLevel: AlmaActionRisk,
  approvalPolicy: AlmaApprovalPolicy,
) {
  return (
    approvalPolicy !== "automatic" ||
    riskLevel === "external" ||
    riskLevel === "protected"
  );
}

export async function prepareAuditedAction(
  input: AuditedActionInput,
): Promise<AuditedActionDecision> {
  if (!requiresApproval(input.riskLevel, input.approvalPolicy)) {
    await ActionApprovalRepository.createAuditEvent({
      userId: input.userId,
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      executionId: input.executionId,
      actionKey: input.actionKey,
      eventType: "action.allowed",
      riskLevel: input.riskLevel,
      payload: input.requestedPayload,
    });

    return { canExecute: true, status: "approved", approval: null };
  }

  const approval = await ActionApprovalRepository.create({
    userId: input.userId,
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    executionId: input.executionId,
    domain: input.domain,
    actionKey: input.actionKey,
    actionSummary: input.actionSummary,
    status: "awaiting_approval",
    riskLevel: input.riskLevel,
    approvalPolicy: input.approvalPolicy,
    requestedPayload: input.requestedPayload,
  });

  await ActionApprovalRepository.createAuditEvent({
    userId: input.userId,
    workspaceId: input.workspaceId,
    approvalId: approval.id,
    agentId: input.agentId,
    executionId: input.executionId,
    actionKey: input.actionKey,
    eventType: "approval.awaiting_approval",
    riskLevel: input.riskLevel,
    payload: input.requestedPayload,
  });

  return { canExecute: false, status: "awaiting_approval", approval };
}

export async function assertAuditedActionCanExecute(input: {
  userId: string;
  approvalId: string;
  resultPayload?: Record<string, unknown>;
}) {
  const approval = await ActionApprovalRepository.getForUser(
    input.userId,
    input.approvalId,
  );

  if (!approval || approval.status !== "approved") {
    throw new ActionApprovalRequiredError(
      "This external action requires approval before execution.",
      input.approvalId,
    );
  }

  return transitionActionApproval({
    userId: input.userId,
    approvalId: input.approvalId,
    nextStatus: "executing",
    resultPayload: input.resultPayload,
  });
}

export async function executeApprovedAction(input: {
  userId: string;
  approvalId: string;
  editedPayload?: Record<string, unknown> | null;
}) {
  const approval = await ActionApprovalRepository.getForUser(
    input.userId,
    input.approvalId,
  );

  if (!approval) {
    throw new ActionApprovalRequiredError(
      "Approval not found for this user.",
      input.approvalId,
    );
  }

  if (approval.status === "completed" || approval.status === "executing") {
    return {
      ok: false,
      status: approval.status,
      message: "This approval has already been executed.",
      approval,
    };
  }

  if (
    approval.status !== "awaiting_approval" &&
    approval.status !== "approved"
  ) {
    return {
      ok: false,
      status: approval.status,
      message: "This approval is not executable.",
      approval,
    };
  }

  const executor = getActionExecutor(approval.action_key);
  if (!executor) {
    const failed = await transitionActionApproval({
      userId: input.userId,
      approvalId: approval.id,
      nextStatus: "failed",
      errorMessage: "No approved executor is available for this action.",
    });
    return {
      ok: false,
      status: "failed",
      message: "No approved executor is available for this action.",
      approval: failed,
    };
  }

  const payload = executor.validate(
    input.editedPayload ??
      approval.approved_payload ??
      approval.requested_payload,
  );

  if (approval.status === "awaiting_approval") {
    await transitionActionApproval({
      userId: input.userId,
      approvalId: approval.id,
      nextStatus: "approved",
      approvedPayload: payload,
    });
  }

  await assertAuditedActionCanExecute({
    userId: input.userId,
    approvalId: approval.id,
    resultPayload: { actionKey: approval.action_key },
  });

  try {
    await ActionApprovalRepository.createAuditEvent({
      userId: input.userId,
      workspaceId: approval.workspace_id,
      approvalId: approval.id,
      agentId: approval.agent_id,
      executionId: approval.execution_id,
      actionKey: approval.action_key,
      eventType: "action.executing",
      riskLevel: approval.risk_level,
      payload,
    });
    const result = await executor.execute(input.userId, payload, approval);
    if (!result.success) throw new Error(result.message);
    const completed = await transitionActionApproval({
      userId: input.userId,
      approvalId: approval.id,
      nextStatus: "completed",
      resultPayload: result.result ?? { message: result.message },
    });
    return {
      ok: true,
      status: "completed",
      message: result.message,
      approval: completed,
    };
  } catch {
    const failed = await transitionActionApproval({
      userId: input.userId,
      approvalId: approval.id,
      nextStatus: "failed",
      errorMessage:
        "The approved action could not be executed. Check the integration connection and try again.",
    });
    return {
      ok: false,
      status: "failed",
      message:
        "The approved action could not be executed. Check the integration connection and try again.",
      approval: failed,
    };
  }
}
