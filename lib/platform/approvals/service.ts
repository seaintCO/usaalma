import { ActionApprovalRepository } from "./repository";
import {
  canTransitionActionApproval,
  type ActionApprovalRecord,
  type ActionApprovalStatus,
} from "./types";

export class ActionApprovalTransitionError extends Error {
  constructor(
    message: string,
    public readonly code:
      "approval_not_found" | "invalid_transition" | "unauthorized",
  ) {
    super(message);
    this.name = "ActionApprovalTransitionError";
  }
}

export async function transitionActionApproval(input: {
  userId: string;
  approvalId: string;
  nextStatus: ActionApprovalStatus;
  actorUserId?: string | null;
  approvedPayload?: Record<string, unknown> | null;
  resultPayload?: Record<string, unknown> | null;
  errorMessage?: string | null;
}): Promise<ActionApprovalRecord> {
  if (input.actorUserId && input.actorUserId !== input.userId) {
    throw new ActionApprovalTransitionError(
      "Only the owning user can transition this approval.",
      "unauthorized",
    );
  }

  const current = await ActionApprovalRepository.getForUser(
    input.userId,
    input.approvalId,
  );

  if (!current) {
    throw new ActionApprovalTransitionError(
      "Approval not found for this user.",
      "approval_not_found",
    );
  }

  if (!canTransitionActionApproval(current.status, input.nextStatus)) {
    throw new ActionApprovalTransitionError(
      `Cannot transition approval from ${current.status} to ${input.nextStatus}.`,
      "invalid_transition",
    );
  }

  const updated = await ActionApprovalRepository.transition({
    userId: input.userId,
    approvalId: input.approvalId,
    status: input.nextStatus,
    actorUserId: input.actorUserId,
    approvedPayload: input.approvedPayload,
    resultPayload: input.resultPayload,
    errorMessage: input.errorMessage,
  });

  await ActionApprovalRepository.createAuditEvent({
    userId: input.userId,
    workspaceId: updated.workspace_id,
    approvalId: updated.id,
    agentId: updated.agent_id,
    executionId: updated.execution_id,
    actionKey: updated.action_key,
    eventType: `approval.${input.nextStatus}`,
    riskLevel: updated.risk_level,
    payload: {
      from: current.status,
      to: input.nextStatus,
      error: input.errorMessage ?? null,
    },
  });

  return updated;
}
