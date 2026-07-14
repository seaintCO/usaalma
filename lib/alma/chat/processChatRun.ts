import "server-only";

/**
 * Stage 1 contract boundary for the canonical ALMA chat processor.
 *
 * This module deliberately has no runtime processor yet.  The compatibility
 * route continues to own execution until the subsequent, approved extraction
 * stages move one complete branch at a time.
 */

export type ChatRunLanguage = "en" | "es" | "auto";

export type ChatRunResponseType =
  | "text"
  | "image"
  | "image_edit_request"
  | "planned_execution"
  | "finance_analysis"
  | "tool_assisted";

export type ChatRunRoute =
  | "alma_image_generation"
  | "alma_image_followup"
  | "planned_execution"
  | "finance_analysis"
  | "image_generate"
  | "image_edit"
  | "tool_assisted"
  | "chat";

export type ChatRunTrackingContext = {
  agentId: string;
  executionId: string;
};

export type ProcessChatRunInput = {
  userId: string;
  conversationId: string;
  userMessage: string;
  language: ChatRunLanguage;
  /** Supplied by a future durable submission flow; not used in Stage 1. */
  idempotencyKey?: string;
  /** Allows a future worker to continue an already-created execution. */
  tracking?: ChatRunTrackingContext | null;
  /** Transport-independent notification hook for interactive and durable runs. */
  onProgress?: ChatRunProgressCallback;
};

export type ChatRunProgressEvent =
  | { type: "stream_started"; conversationId: string }
  | { type: "status"; message: string }
  | { type: "text_delta"; delta: string }
  | { type: "image"; content: string; mimeType?: string }
  | { type: "completed"; result: ChatRunSuccessResult }
  | { type: "failed"; error: ChatRunFailureResult };

export type ChatRunProgressCallback = (
  event: ChatRunProgressEvent,
) => void | Promise<void>;

export type ChatRunSuccessResult = {
  ok: true;
  responseType: ChatRunResponseType;
  route: ChatRunRoute;
  finalContent: string;
  assistantMessageId?: string;
  tracking: ChatRunTrackingContext | null;
  image?: {
    mimeType?: string;
    generated: boolean;
  };
  tools?: {
    calls: number;
    names: string[];
  };
};

export type ChatRunFailureResult = {
  ok: false;
  responseType: ChatRunResponseType;
  route: ChatRunRoute;
  finalContent?: string;
  tracking: ChatRunTrackingContext | null;
  code:
    | "memory_persistence_failed"
    | "image_generation_failed"
    | "model_request_failed"
    | "stream_failed"
    | "tool_execution_failed"
    | "unknown";
  message: string;
};

export type ChatRunResult = ChatRunSuccessResult | ChatRunFailureResult;
