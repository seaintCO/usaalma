import { sendGmailTool } from "@/lib/tools/gmail/gmailTools";
import type { ActionApprovalRecord } from "@/lib/platform/approvals/types";

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
};

export function getActionExecutor(actionKey: string) {
  return EXECUTORS[actionKey] ?? null;
}

export function listExecutableActionKeys() {
  return Object.keys(EXECUTORS);
}
