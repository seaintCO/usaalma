import { ActionApprovalRepository } from "@/lib/platform/approvals/repository";
import type { ActionApprovalRecord } from "@/lib/platform/approvals/types";
import { transitionActionApproval } from "@/lib/platform/approvals/service";
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
