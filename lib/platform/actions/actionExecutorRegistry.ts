import { sendGmailTool } from "@/lib/tools/gmail/gmailTools";
import type { ActionApprovalRecord } from "@/lib/platform/approvals/types";
import { OfficeRepository } from "@/lib/office/repository";

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
      const result = await sendGmailTool(userId, to, subject, body);
      return {
        success: result.success === true,
        message:
          typeof result.message === "string"
            ? result.message
            : "Gmail send completed.",
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
        estimateNumber: readRequiredString(payload, "estimateNumber", 80),
        message: readRequiredString(payload, "message", 10000),
        deliveryChannel:
          typeof payload.deliveryChannel === "string"
            ? payload.deliveryChannel
            : "email",
      };
    },
    async execute(userId, payload, approval) {
      const estimateId = readRequiredString(payload, "estimateId", 80);
      const recipient = readRequiredString(payload, "recipient", 320);
      const estimateNumber = readRequiredString(payload, "estimateNumber", 80);
      const message = readRequiredString(payload, "message", 10000);
      const deliveryChannel =
        typeof payload.deliveryChannel === "string"
          ? payload.deliveryChannel
          : "email";
      if (deliveryChannel !== "email") {
        return {
          success: false,
          message:
            "This delivery channel is not connected. No estimate was sent.",
        };
      }
      const subject = `Estimate ${estimateNumber}`;
      const sendResult = await sendGmailTool(
        userId,
        recipient,
        subject,
        message,
      );
      if (sendResult.success !== true) {
        return {
          success: false,
          message:
            "Email delivery is blocked. Connect Gmail before sending estimates.",
          result: sendResult as Record<string, unknown>,
        };
      }
      await OfficeRepository.transitionEstimate(
        userId,
        estimateId,
        "sent",
        "Estimate delivered by approved executor.",
        approval.id,
      );
      return {
        success: true,
        message: "Estimate sent.",
        result: { estimateId, estimateNumber, deliveryChannel },
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
