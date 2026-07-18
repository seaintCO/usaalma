import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  getThreadForUser,
  insertCommunicationMessage,
} from "@/lib/communications/inboxRepository";
import { prepareAuditedAction } from "@/lib/platform/actions/executionBoundary";
import { ConnectorRepository } from "@/lib/connectors/repository";
import {
  chooseWhatsAppMessagePolicy,
  normalizeWhatsAppPhone,
} from "@/lib/connectors/providers/whatsapp";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const threadId = typeof body.threadId === "string" ? body.threadId : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const templateName =
    typeof body.templateName === "string" ? body.templateName.trim() : "";
  if (!threadId || !message) {
    return NextResponse.json(
      { ok: false, error: { code: "thread_and_message_required" } },
      { status: 400 },
    );
  }
  const thread = await getThreadForUser({ userId: user.id, threadId });
  if (!thread || thread.channel !== "whatsapp") {
    return NextResponse.json(
      { ok: false, error: { code: "thread_not_found" } },
      { status: 404 },
    );
  }
  // WhatsApp is limited to business-specific customer/operations messaging.
  // It is not a general ALMA assistant channel and never bypasses approvals.
  const workspaceId = thread.workspace_id as string;
  const connection = await ConnectorRepository.getConnectedWhatsAppConnection({
    userId: user.id,
    workspaceId,
  }).catch(() => null);
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: { code: "whatsapp_connection_required" } },
      { status: 409 },
    );
  }
  const policy = chooseWhatsAppMessagePolicy({
    lastInboundAt: thread.last_inbound_at as string | null,
    templateName,
  });
  if (!policy.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "whatsapp_template_required",
          message:
            "A Meta-approved template is required outside the customer service window.",
        },
      },
      { status: 409 },
    );
  }
  const approval = await prepareAuditedAction({
    userId: user.id,
    workspaceId,
    domain: "communications",
    actionKey: "whatsapp.message.send",
    actionSummary: `Send WhatsApp message to ${thread.contact_address}`,
    riskLevel: "external",
    approvalPolicy: "approval_required",
    requestedPayload: {
      threadId,
      workspaceId,
      connectionId: connection.id,
      toPhone: normalizeWhatsAppPhone(String(thread.contact_address)),
      body: message,
      templateName: templateName || null,
      language: body.language === "es" ? "es" : "en",
    },
  });
  if (approval.approval) {
    await insertCommunicationMessage({
      userId: user.id,
      workspaceId,
      threadId,
      channel: "whatsapp",
      direction: "outbound",
      providerStatus: "awaiting_approval",
      originalText: message,
    });
  }
  return NextResponse.json({ ok: true, approval });
}
