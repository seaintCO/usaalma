import type { ActionApprovalRecord } from "@/lib/platform/approvals/types";
import { OfficeRepository } from "@/lib/office/repository";
import { sendConnectedEmail } from "@/lib/connectors/emailDelivery";
import { ConnectorRepository } from "@/lib/connectors/repository";

export type ActionExecutionResult = {
  success: boolean;
  message: string;
  result?: Record<string, unknown>;
};

type Executor = {
  key: string;
  editable: boolean;
  validate: (payload: Record<string, unknown>) => Record<string, unknown>;
  execute: (
    userId: string,
    payload: Record<string, unknown>,
    approval: ActionApprovalRecord,
  ) => Promise<ActionExecutionResult>;
};

function readRequiredString(
  payload: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
  const value = typeof payload[key] === "string" ? payload[key].trim() : "";
  if (!value || value.length > maxLength) {
    throw new Error(`invalid_${key}`);
  }
  return value;
}

const EXECUTORS: Record<string, Executor> = {
  "gmail.send": {
    key: "gmail.send",
    editable: true,
    validate(payload) {
      return {
        to: readRequiredString(payload, "to", 320),
        subject: readRequiredString(payload, "subject", 240),
        body: readRequiredString(payload, "body", 10000),
      };
    },
    async execute(userId, payload) {
      const to = readRequiredString(payload, "to", 320);
      const subject = readRequiredString(payload, "subject", 240);
      const body = readRequiredString(payload, "body", 10000);
      const workspaceId =
        await ConnectorRepository.resolveDefaultWorkspaceId(userId);
      if (!workspaceId) {
        return {
          success: false,
          message: "Create or select a workspace before sending email.",
        };
      }
      const result = await sendConnectedEmail({
        userId,
        workspaceId,
        provider: "gmail",
        to,
        subject,
        text: body,
      });
      return {
        success: result.ok,
        message: result.ok
          ? "Gmail send completed."
          : (result.error?.message ?? "Gmail could not send the email."),
        result: result as Record<string, unknown>,
      };
    },
  },
  "office.estimate.deliver": {
    key: "office.estimate.deliver",
    editable: true,
    validate(payload) {
      return {
        estimateId: readRequiredString(payload, "estimateId", 80),
        recipient: readRequiredString(payload, "recipient", 320),
        subject: readRequiredString(payload, "subject", 240),
        estimateNumber: readRequiredString(payload, "estimateNumber", 80),
        message: readRequiredString(payload, "message", 10000),
        deliveryProvider:
          payload.deliveryProvider === "outlook" ? "outlook" : "gmail",
        connectionId:
          typeof payload.connectionId === "string" ? payload.connectionId : "",
        workspaceId:
          typeof payload.workspaceId === "string" ? payload.workspaceId : "",
        followUpDueAt:
          typeof payload.followUpDueAt === "string"
            ? payload.followUpDueAt
            : "",
        followUpMessage:
          typeof payload.followUpMessage === "string"
            ? payload.followUpMessage
            : "",
      };
    },
    async execute(userId, payload, approval) {
      const estimateId = readRequiredString(payload, "estimateId", 80);
      const recipient = readRequiredString(payload, "recipient", 320);
      const subject = readRequiredString(payload, "subject", 240);
      const estimateNumber = readRequiredString(payload, "estimateNumber", 80);
      const message = readRequiredString(payload, "message", 10000);
      const deliveryProvider =
        payload.deliveryProvider === "outlook" ? "outlook" : "gmail";
      const estimate = await OfficeRepository.getEstimate(userId, estimateId);
      if (
        !estimate ||
        !["approved", "awaiting_review", "sent"].includes(estimate.status)
      ) {
        return {
          success: false,
          message: "Estimate is not sendable. No email was sent.",
        };
      }
      if (estimate.status === "sent" && estimate.delivery_message_id) {
        return {
          success: true,
          message: "Estimate was already sent.",
          result: {
            estimateId,
            estimateNumber,
            providerMessageId: estimate.delivery_message_id,
          },
        };
      }
      const workspaceId =
        typeof approval.workspace_id === "string" && approval.workspace_id
          ? approval.workspace_id
          : (estimate.workspace_id as string | null) ||
            (await ConnectorRepository.resolveDefaultWorkspaceId(userId));
      if (!workspaceId) {
        return {
          success: false,
          message: "Create or select a workspace before sending estimates.",
        };
      }
      const connection = await ConnectorRepository.getConnectedEmailConnection({
        userId,
        workspaceId,
        provider: deliveryProvider,
      });
      if (!connection) {
        return {
          success: false,
          message: "Connect Gmail or Outlook before sending estimates.",
        };
      }
      const deliveryRecord = await ConnectorRepository.createDeliveryRecord({
        userId,
        workspaceId,
        approvalId: approval.id,
        estimateId,
        connectionId: connection.id,
        provider: deliveryProvider,
        recipient,
        subject,
      });
      if (
        deliveryRecord.status === "sent" &&
        deliveryRecord.provider_message_id
      ) {
        return {
          success: true,
          message: "Estimate was already sent.",
          result: {
            estimateId,
            estimateNumber,
            providerMessageId: deliveryRecord.provider_message_id,
          },
        };
      }
      const sendResult = await sendConnectedEmail({
        userId,
        workspaceId,
        provider: deliveryProvider,
        to: recipient,
        subject,
        text: message,
      });
      if (!sendResult.ok || !sendResult.providerMessageId) {
        await ConnectorRepository.failDelivery({
          deliveryId: deliveryRecord.id,
          status:
            sendResult.error?.code === "email_connection_required"
              ? "blocked"
              : "failed",
          code: sendResult.error?.code ?? "email_send_failed",
          message: sendResult.error?.message ?? "Email send failed.",
        });
        return {
          success: false,
          message:
            sendResult.error?.message ??
            "Email delivery failed. Estimate was not marked sent.",
          result: sendResult as Record<string, unknown>,
        };
      }
      const deliveredAt = await ConnectorRepository.completeDelivery({
        deliveryId: deliveryRecord.id,
        providerMessageId: sendResult.providerMessageId,
      });
      await OfficeRepository.markEstimateDelivered({
        userId,
        estimateId,
        provider: deliveryProvider,
        connectionId: connection.id,
        providerMessageId: sendResult.providerMessageId,
        approvalId: approval.id,
      });
      const followUpDueAt =
        typeof payload.followUpDueAt === "string" ? payload.followUpDueAt : "";
      if (followUpDueAt) {
        await OfficeRepository.scheduleEstimateFollowUp({
          userId,
          workspaceId,
          estimateId,
          approvalId: approval.id,
          dueAt: followUpDueAt,
          message:
            typeof payload.followUpMessage === "string"
              ? payload.followUpMessage
              : "",
        });
      }
      return {
        success: true,
        message: "Estimate sent.",
        result: {
          estimateId,
          estimateNumber,
          deliveryProvider,
          providerMessageId: sendResult.providerMessageId,
          deliveredAt,
        },
      };
    },
  },
};

export function getActionExecutor(actionKey: string) {
  return EXECUTORS[actionKey] ?? null;
}

export function listExecutableActionKeys() {
  return Object.keys(EXECUTORS);
}
